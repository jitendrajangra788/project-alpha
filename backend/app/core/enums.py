import enum


class RoleCode(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    HOSPITAL_OWNER = "HOSPITAL_OWNER"
    CLINIC_OWNER = "CLINIC_OWNER"
    NURSING_HOME_OWNER = "NURSING_HOME_OWNER"
    HOME_CARE_OWNER = "HOME_CARE_OWNER"
    LAB_OWNER = "LAB_OWNER"
    DIAGNOSTIC_CENTRE_OWNER = "DIAGNOSTIC_CENTRE_OWNER"
    NURSE = "NURSE"
    CAREGIVER = "CAREGIVER"
    LAB_TECHNICIAN = "LAB_TECHNICIAN"
    RECEPTIONIST = "RECEPTIONIST"
    ORGANIZATION_MANAGER = "ORGANIZATION_MANAGER"
    PHARMACY_OWNER = "PHARMACY_OWNER"


class OrganizationType(str, enum.Enum):
    HOSPITAL = "HOSPITAL"
    CLINIC = "CLINIC"
    NURSING_HOME = "NURSING_HOME"
    HOME_CARE = "HOME_CARE"
    LAB = "LAB"
    DIAGNOSTIC_CENTRE = "DIAGNOSTIC_CENTRE"


class VerificationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


class MembershipRole(str, enum.Enum):
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    STAFF = "STAFF"
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    CAREGIVER = "CAREGIVER"
    RECEPTIONIST = "RECEPTIONIST"
    LAB_TECH = "LAB_TECH"
    PHARMACIST = "PHARMACIST"


# Map org membership roles → platform user roles (for RBAC login panels).
MEMBERSHIP_TO_USER_ROLE = {
    MembershipRole.OWNER: None,  # owner role already assigned on org create
    MembershipRole.MANAGER: RoleCode.ORGANIZATION_MANAGER,
    MembershipRole.STAFF: None,
    MembershipRole.DOCTOR: RoleCode.DOCTOR,
    MembershipRole.NURSE: RoleCode.NURSE,
    MembershipRole.CAREGIVER: RoleCode.CAREGIVER,
    MembershipRole.RECEPTIONIST: RoleCode.RECEPTIONIST,
    MembershipRole.LAB_TECH: RoleCode.LAB_TECHNICIAN,
    MembershipRole.PHARMACIST: None,
}

# Roles allowed to manage staff / branches for an organization
ORG_ADMIN_MEMBERSHIP_ROLES = {
    MembershipRole.OWNER.value,
    MembershipRole.MANAGER.value,
}


ORG_TYPE_TO_OWNER_ROLE = {
    OrganizationType.HOSPITAL: RoleCode.HOSPITAL_OWNER,
    OrganizationType.CLINIC: RoleCode.CLINIC_OWNER,
    OrganizationType.NURSING_HOME: RoleCode.NURSING_HOME_OWNER,
    OrganizationType.HOME_CARE: RoleCode.HOME_CARE_OWNER,
    OrganizationType.LAB: RoleCode.LAB_OWNER,
    OrganizationType.DIAGNOSTIC_CENTRE: RoleCode.DIAGNOSTIC_CENTRE_OWNER,
}


class ListingType(str, enum.Enum):
    DOCTOR = "DOCTOR"
    HOSPITAL = "HOSPITAL"
    CLINIC = "CLINIC"
    NURSING_HOME = "NURSING_HOME"
    HOME_CARE = "HOME_CARE"
    LAB = "LAB"
    DIAGNOSTIC_CENTRE = "DIAGNOSTIC_CENTRE"


ORG_TYPE_TO_LISTING_TYPE = {
    OrganizationType.HOSPITAL: ListingType.HOSPITAL,
    OrganizationType.CLINIC: ListingType.CLINIC,
    OrganizationType.NURSING_HOME: ListingType.NURSING_HOME,
    OrganizationType.HOME_CARE: ListingType.HOME_CARE,
    OrganizationType.LAB: ListingType.LAB,
    OrganizationType.DIAGNOSTIC_CENTRE: ListingType.DIAGNOSTIC_CENTRE,
}


class BookingType(str, enum.Enum):
    DOCTOR = "DOCTOR"
    HOSPITAL = "HOSPITAL"
    CLINIC = "CLINIC"
    NURSING_HOME = "NURSING_HOME"
    HOME_CARE = "HOME_CARE"
    LAB = "LAB"
    HEALTH_PACKAGE = "HEALTH_PACKAGE"
    SAMPLE_COLLECTION = "SAMPLE_COLLECTION"
    VIDEO_CONSULTATION = "VIDEO_CONSULTATION"


class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    REFUNDED = "REFUNDED"


class PaymentStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class SlotStatus(str, enum.Enum):
    OPEN = "OPEN"
    BOOKED = "BOOKED"
    BLOCKED = "BLOCKED"


class ConsentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"


class ReportStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    REJECTED = "REJECTED"


class TimelineEventType(str, enum.Enum):
    BOOKING = "BOOKING"
    CONSULTATION = "CONSULTATION"
    PRESCRIPTION = "PRESCRIPTION"
    LAB_REPORT = "LAB_REPORT"
    VITALS = "VITALS"
    DOCUMENT = "DOCUMENT"
    NURSING_REPORT = "NURSING_REPORT"


class VideoSessionStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    WAITING = "WAITING"
    LIVE = "LIVE"
    ENDED = "ENDED"
    CANCELLED = "CANCELLED"


class PaymentPurpose(str, enum.Enum):
    BOOKING = "BOOKING"
    SUBSCRIPTION = "SUBSCRIPTION"
    FEATURED_LISTING = "FEATURED_LISTING"


class PaymentProvider(str, enum.Enum):
    RAZORPAY = "RAZORPAY"
    MOCK = "MOCK"


class RefundStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    VOID = "VOID"


class PayoutStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    FAILED = "FAILED"


class SubscriptionStatus(str, enum.Enum):
    TRIAL = "TRIAL"
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class SubscriptionPlanCode(str, enum.Enum):
    BASIC = "BASIC"
    GROWTH = "GROWTH"
    FEATURED = "FEATURED"


class TransactionType(str, enum.Enum):
    PAYMENT = "PAYMENT"
    REFUND = "REFUND"
    COMMISSION = "COMMISSION"
    PAYOUT = "PAYOUT"
    SUBSCRIPTION = "SUBSCRIPTION"
