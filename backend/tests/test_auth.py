import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_patient_register_and_login(client: AsyncClient):
    register = await client.post(
        "/api/v1/auth/register/patient",
        json={
            "full_name": "Rohit Patient",
            "mobile": "9111111111",
            "password": "Patient@123",
            "email": "rohit.patient@example.com",
        },
    )
    assert register.status_code == 200, register.text
    body = register.json()
    assert body["user"]["roles"] == ["PATIENT"]
    assert body["tokens"]["access_token"]
    assert body["tokens"]["refresh_token"]

    login = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "9111111111", "password": "Patient@123"},
    )
    assert login.status_code == 200
    tokens = login.json()["tokens"]

    refresh = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refresh.status_code == 200
    assert refresh.json()["access_token"]

    me = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {refresh.json()['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["mobile"] == "9111111111"


@pytest.mark.asyncio
async def test_admin_login_and_rbac_denial(client: AsyncClient):
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@example.com", "password": "Admin@12345"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["tokens"]["access_token"]

    dash = await client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert dash.status_code == 200

    patient = await client.post(
        "/api/v1/auth/register/patient",
        json={
            "full_name": "No Admin",
            "mobile": "9222222222",
            "password": "Patient@123",
            "email": "noadmin@example.com",
        },
    )
    patient_token = patient.json()["tokens"]["access_token"]
    denied = await client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert denied.status_code == 403
