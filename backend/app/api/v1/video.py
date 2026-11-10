from typing import Dict, List, Set

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.deps import CurrentUser, DbSession
from app.schemas.video import (
    EndSessionRequest,
    VideoJoinTokenOut,
    VideoSessionCreate,
    VideoSessionNotes,
    VideoSessionOut,
)
from app.services import video as video_service

router = APIRouter()


class SignalingHub:
    """In-memory WebRTC signaling rooms. Not for multi-process production without Redis pub/sub."""

    def __init__(self) -> None:
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.rooms.setdefault(session_id, set()).add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        peers = self.rooms.get(session_id)
        if not peers:
            return
        peers.discard(websocket)
        if not peers:
            self.rooms.pop(session_id, None)

    async def broadcast(self, session_id: str, message: dict, sender: WebSocket) -> None:
        for peer in list(self.rooms.get(session_id, set())):
            if peer is sender:
                continue
            try:
                await peer.send_json(message)
            except Exception:
                self.disconnect(session_id, peer)


signaling_hub = SignalingHub()


@router.post("/sessions", response_model=VideoSessionOut)
async def create_session(payload: VideoSessionCreate, user: CurrentUser, db: DbSession):
    return await video_service.create_session(db, user, payload.booking_id)


@router.get("/sessions/me", response_model=List[VideoSessionOut])
async def my_sessions(user: CurrentUser, db: DbSession):
    return await video_service.list_my_sessions(db, user)


@router.get("/sessions/{session_id}", response_model=VideoSessionOut)
async def get_session(session_id: str, user: CurrentUser, db: DbSession):
    return await video_service.get_session(db, session_id, user)


@router.post("/sessions/{session_id}/join", response_model=VideoJoinTokenOut)
async def join_session(session_id: str, user: CurrentUser, db: DbSession):
    return await video_service.join_session(db, session_id, user)


@router.post("/sessions/{session_id}/end", response_model=VideoSessionOut)
async def end_session(session_id: str, user: CurrentUser, db: DbSession, payload: EndSessionRequest | None = None):
    body = payload or EndSessionRequest()
    notes = None
    if body.notes:
        notes = VideoSessionNotes(
            notes=body.notes,
            diagnosis=body.diagnosis,
            finalize_consultation=body.finalize_consultation,
        )
    return await video_service.end_session(
        db, session_id, user, reason=body.reason, notes_payload=notes
    )


@router.websocket("/ws/{session_id}")
async def video_signaling(websocket: WebSocket, session_id: str, token: str = Query(...)):
    """Short-lived room token required. Relays SDP/ICE between authorized peers only."""
    try:
        claims = video_service.decode_room_token(token)
    except Exception:
        await websocket.close(code=4401)
        return
    if claims.get("sid") != session_id:
        await websocket.close(code=4403)
        return

    await signaling_hub.connect(session_id, websocket)
    await websocket.send_json(
        {
            "type": "joined",
            "session_id": session_id,
            "role": claims.get("role"),
            "peers": max(len(signaling_hub.rooms.get(session_id, set())) - 1, 0),
        }
    )
    # Notify others that a peer joined
    await signaling_hub.broadcast(
        session_id,
        {"type": "peer-joined", "role": claims.get("role")},
        sender=websocket,
    )
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type not in {"offer", "answer", "ice-candidate", "hangup", "chat"}:
                continue
            await signaling_hub.broadcast(
                session_id,
                {
                    "type": msg_type,
                    "payload": data.get("payload"),
                    "from_role": claims.get("role"),
                },
                sender=websocket,
            )
            if msg_type == "hangup":
                break
    except WebSocketDisconnect:
        pass
    finally:
        signaling_hub.disconnect(session_id, websocket)
        await signaling_hub.broadcast(
            session_id,
            {"type": "peer-left", "role": claims.get("role")},
            sender=websocket,
        )
