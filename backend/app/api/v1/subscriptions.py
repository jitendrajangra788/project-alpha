from typing import List

from fastapi import APIRouter, Query

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.schemas.payment import (
    OrganizationSubscriptionOut,
    PaymentOrderOut,
    SubscribeRequest,
    SubscriptionPlanCreate,
    SubscriptionPlanOut,
)
from app.services import payments as payment_service

router = APIRouter()


@router.get("/plans", response_model=List[SubscriptionPlanOut])
async def list_plans(db: DbSession, active_only: bool = Query(True)):
    return await payment_service.list_plans(db, active_only=active_only)


@router.post("/plans", response_model=SubscriptionPlanOut)
async def create_plan(payload: SubscriptionPlanCreate, _: AdminUser, db: DbSession):
    return await payment_service.create_plan(db, payload)


@router.post("/subscribe", response_model=PaymentOrderOut)
async def subscribe(payload: SubscribeRequest, user: CurrentUser, db: DbSession):
    return await payment_service.create_subscription_order(db, user, payload)


@router.get("/organizations/{organization_id}", response_model=List[OrganizationSubscriptionOut])
async def org_subscriptions(organization_id: str, user: CurrentUser, db: DbSession):
    return await payment_service.list_org_subscriptions(db, user, organization_id)
