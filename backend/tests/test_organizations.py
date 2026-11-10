import io

import pytest
from httpx import AsyncClient


async def _register_provider(client: AsyncClient, mobile: str, email: str):
    # Providers register as patients first then create org (owner role assigned on org create)
    res = await client.post(
        "/api/v1/auth/register/patient",
        json={
            "full_name": f"Owner {mobile}",
            "mobile": mobile,
            "password": "Owner@12345",
            "email": email,
        },
    )
    assert res.status_code == 200, res.text
    return res.json()


@pytest.mark.asyncio
async def test_org_registration_verification_and_isolation(client: AsyncClient):
    owner_a = await _register_provider(client, "9333333333", "owner.a@example.com")
    owner_b = await _register_provider(client, "9444444444", "owner.b@example.com")
    token_a = owner_a["tokens"]["access_token"]
    token_b = owner_b["tokens"]["access_token"]

    create_a = await client.post(
        "/api/v1/organizations",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "name": "Alpha Clinic",
            "organization_type": "CLINIC",
            "contact_number": "9333333333",
            "email": "alpha@example.com",
            "address_line": "12 MG Road",
            "city": "Lucknow",
            "pin_code": "226001",
            "license_number": "CL-001",
            "submit_for_verification": True,
        },
    )
    assert create_a.status_code == 200, create_a.text
    org_a = create_a.json()
    assert org_a["is_verified"] is False
    assert org_a["verification_status"] == "PENDING"

    create_b = await client.post(
        "/api/v1/organizations",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "name": "Beta Hospital",
            "organization_type": "HOSPITAL",
            "contact_number": "9444444444",
            "address_line": "45 Park Street",
            "city": "Lucknow",
            "pin_code": "226002",
            "submit_for_verification": True,
        },
    )
    assert create_b.status_code == 200
    org_b = create_b.json()

    # Cross-tenant access denied
    forbidden = await client.get(
        f"/api/v1/organizations/{org_b['id']}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert forbidden.status_code == 403

    allowed = await client.get(
        f"/api/v1/organizations/{org_a['id']}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert allowed.status_code == 200

    # Upload document then admin verifies
    upload = await client.post(
        f"/api/v1/organizations/{org_a['id']}/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        data={"document_type": "license"},
        files={"file": ("license.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")},
    )
    assert upload.status_code == 200, upload.text
    assert len(upload.json()["documents"]) == 1

    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@example.com", "password": "Admin@12345"},
    )
    admin_token = admin_login.json()["tokens"]["access_token"]

    verify = await client.post(
        f"/api/v1/organizations/{org_a['id']}/verification",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "VERIFIED", "notes": "Documents look good"},
    )
    assert verify.status_code == 200, verify.text
    assert verify.json()["is_verified"] is True
    assert verify.json()["verification_status"] == "VERIFIED"

    # Brand settings
    settings = await client.get("/api/v1/platform-settings")
    assert settings.status_code == 200
    assert settings.json()["brand_name"] == "CareConnect"


@pytest.mark.asyncio
async def test_org_staff_and_branch_crud(client: AsyncClient):
    owner = await _register_provider(client, "9555555555", "staff.owner@example.com")
    token = owner["tokens"]["access_token"]

    create = await client.post(
        "/api/v1/organizations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Staff Hospital",
            "organization_type": "HOSPITAL",
            "contact_number": "9555555555",
            "address_line": "1 Care Lane",
            "city": "Lucknow",
            "pin_code": "226001",
            "submit_for_verification": False,
        },
    )
    assert create.status_code == 200, create.text
    org_id = create.json()["id"]

    add = await client.post(
        f"/api/v1/organizations/{org_id}/members",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Nurse Rita",
            "mobile": "9666666666",
            "email": "rita.nurse@example.com",
            "password": "Nurse@12345",
            "membership_role": "NURSE",
        },
    )
    assert add.status_code == 200, add.text
    member = add.json()
    assert member["membership_role"] == "NURSE"
    assert member["is_active"] is True

    doctor_add = await client.post(
        f"/api/v1/organizations/{org_id}/members",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Dr Anita",
            "mobile": "9777777777",
            "email": "",
            "password": "Doctor@123",
            "membership_role": "DOCTOR",
            "specialty": "Cardiology",
            "qualification": "MBBS, MD",
            "consultation_fee": 700,
        },
    )
    assert doctor_add.status_code == 200, doctor_add.text
    assert doctor_add.json()["membership_role"] == "DOCTOR"

    listed = await client.get(
        f"/api/v1/organizations/{org_id}/members",
        headers={"Authorization": f"Bearer {token}"},
        params={"role": "NURSE"},
    )
    assert listed.status_code == 200
    assert any(m["id"] == member["id"] for m in listed.json())

    updated = await client.patch(
        f"/api/v1/organizations/{org_id}/members/{member['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"full_name": "Nurse Rita Updated", "membership_role": "NURSE"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["full_name"] == "Nurse Rita Updated"

    removed = await client.delete(
        f"/api/v1/organizations/{org_id}/members/{member['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert removed.status_code == 204

    branch = await client.post(
        f"/api/v1/organizations/{org_id}/locations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "East Wing",
            "address_line": "2 Care Lane",
            "city": "Lucknow",
            "pin_code": "226002",
            "phone": "9555555555",
            "is_primary": False,
        },
    )
    assert branch.status_code == 200, branch.text
    loc_id = branch.json()["id"]

    patch_loc = await client.patch(
        f"/api/v1/organizations/{org_id}/locations/{loc_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "East Wing OPD"},
    )
    assert patch_loc.status_code == 200
    assert patch_loc.json()["name"] == "East Wing OPD"

    delete_loc = await client.delete(
        f"/api/v1/organizations/{org_id}/locations/{loc_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_loc.status_code == 204
