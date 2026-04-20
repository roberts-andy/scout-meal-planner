from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


# ── Shared enums ──

class MealType(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"
    other = "other"


class MealCourse(str, Enum):
    main = "main"
    side = "side"
    dessert = "dessert"
    snack = "snack"


class CookingMethod(str, Enum):
    open_fire = "open-fire"
    camp_stove = "camp-stove"
    dutch_oven = "dutch-oven"
    skillet = "skillet"
    grill = "grill"
    no_cook = "no-cook"
    other = "other"


class IngredientUnit(str, Enum):
    cup = "cup"
    tbsp = "tbsp"
    tsp = "tsp"
    oz = "oz"
    lb = "lb"
    g = "g"
    kg = "kg"
    ml = "ml"
    l = "l"
    whole = "whole"
    package = "package"
    can = "can"
    to_taste = "to-taste"


class TroopRole(str, Enum):
    troop_admin = "troopAdmin"
    adult_leader = "adultLeader"
    senior_patrol_leader = "seniorPatrolLeader"
    patrol_leader = "patrolLeader"
    scout = "scout"


class MemberStatus(str, Enum):
    active = "active"
    pending = "pending"
    deactivated = "deactivated"
    removed = "removed"


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


# ── Nested object schemas ──

class Ingredient(BaseModel):
    id: str
    name: str = Field(min_length=1)
    quantity: float = Field(ge=0)
    unit: IngredientUnit
    estimatedPrice: Optional[float] = Field(default=None, ge=0)
    category: Optional[str] = None
    notes: Optional[str] = None


class RecipeVariation(BaseModel):
    id: str
    cookingMethod: CookingMethod
    instructions: list[str]
    equipment: list[str]
    cookingTime: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    notes: Optional[str] = None


class RecipeVersion(BaseModel):
    versionNumber: int = Field(ge=1)
    eventId: Optional[str] = None
    eventName: Optional[str] = None
    name: str = Field(min_length=1)
    description: Optional[str] = None
    servings: int = Field(ge=1)
    ingredients: list[Ingredient]
    variations: list[RecipeVariation]
    tags: Optional[list[str]] = None
    createdAt: int
    changeNote: Optional[str] = None


class Meal(BaseModel):
    id: str
    type: MealType
    course: Optional[MealCourse] = None
    dietaryNotes: Optional[str] = None
    name: Optional[str] = None
    recipeId: Optional[str] = None
    scoutCount: int = Field(ge=0)
    isTrailside: Optional[bool] = None
    isTimeConstrained: Optional[bool] = None
    selectedVariationId: Optional[str] = None
    notes: Optional[str] = None
    time: Optional[str] = None


class EventDay(BaseModel):
    date: str
    meals: list[Meal]


class EventHeadcount(BaseModel):
    scoutCount: int = Field(default=0, ge=0)
    adultCount: int = Field(default=0, ge=0)
    guestCount: int = Field(default=0, ge=0)


class FeedbackRating(BaseModel):
    taste: float = Field(ge=1, le=5)
    difficulty: float = Field(ge=1, le=5)
    portionSize: float = Field(ge=1, le=5)


# ── API input schemas ──

class CreateTroop(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class UpdateTroop(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class JoinTroop(BaseModel):
    inviteCode: str = Field(min_length=1)


class CreateEvent(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    startDate: str = Field(min_length=1)
    endDate: str = Field(min_length=1)
    departureTime: Optional[str] = Field(default=None, min_length=1)
    returnTime: Optional[str] = Field(default=None, min_length=1)
    headcount: EventHeadcount = Field(default_factory=EventHeadcount)
    days: list[EventDay]
    packedItems: Optional[list[str]] = None
    purchasedItems: Optional[list[str]] = None
    notes: Optional[str] = None
    hike: Optional[bool] = None
    highAltitude: Optional[bool] = None
    tentCamping: Optional[bool] = None
    cabinCamping: Optional[bool] = None
    powerAvailable: Optional[bool] = None
    runningWater: Optional[bool] = None
    trailerAccess: Optional[bool] = None
    expectedWeather: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None


class UpdateEvent(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    startDate: Optional[str] = Field(default=None, min_length=1)
    endDate: Optional[str] = Field(default=None, min_length=1)
    departureTime: Optional[str] = Field(default=None, min_length=1)
    returnTime: Optional[str] = Field(default=None, min_length=1)
    headcount: Optional[EventHeadcount] = None
    days: Optional[list[EventDay]] = None
    packedItems: Optional[list[str]] = None
    purchasedItems: Optional[list[str]] = None
    notes: Optional[str] = None
    hike: Optional[bool] = None
    highAltitude: Optional[bool] = None
    tentCamping: Optional[bool] = None
    cabinCamping: Optional[bool] = None
    powerAvailable: Optional[bool] = None
    runningWater: Optional[bool] = None
    trailerAccess: Optional[bool] = None
    expectedWeather: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None


class TogglePackedItem(BaseModel):
    item: str = Field(min_length=1)
    packed: bool


class TogglePurchasedItem(BaseModel):
    item: str = Field(min_length=1)
    purchased: bool


class ShoppingListEmailItem(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    quantity: float = Field(ge=0)
    unit: str = Field(min_length=1, max_length=50)


class EmailShoppingList(BaseModel):
    recipientEmail: EmailStr
    items: list[ShoppingListEmailItem] = Field(min_length=1)


class CreateRecipe(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    servings: int = Field(ge=1)
    ingredients: list[Ingredient]
    variations: list[RecipeVariation]
    tags: Optional[list[str]] = None
    clonedFrom: Optional[str] = None
    currentVersion: Optional[int] = Field(default=None, ge=1)
    versions: Optional[list[RecipeVersion]] = None


class UpdateRecipe(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    servings: Optional[int] = Field(default=None, ge=1)
    ingredients: Optional[list[Ingredient]] = None
    variations: Optional[list[RecipeVariation]] = None
    tags: Optional[list[str]] = None
    clonedFrom: Optional[str] = None
    currentVersion: Optional[int] = Field(default=None, ge=1)
    versions: Optional[list[RecipeVersion]] = None


class CreateFeedback(BaseModel):
    eventId: str = Field(min_length=1)
    mealId: str = Field(min_length=1)
    recipeId: str = Field(min_length=1)
    scoutName: Optional[str] = None
    rating: FeedbackRating
    comments: str
    whatWorked: str
    whatToChange: str
    photos: Optional[list[str]] = None


UpdateFeedback = CreateFeedback


class UpdateMember(BaseModel):
    role: Optional[TroopRole] = None
    status: Optional[MemberStatus] = None


class UpdateTroopMemberStatus(BaseModel):
    status: MemberStatus

    @model_validator(mode="after")
    def validate_status(self):
        if self.status not in (MemberStatus.deactivated, MemberStatus.removed):
            raise ValueError("status must be 'deactivated' or 'removed'")
        return self


class CreateMember(BaseModel):
    displayName: str = Field(min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    role: TroopRole

    @model_validator(mode="after")
    def validate_email_for_non_scouts(self):
        if self.role != TroopRole.scout and not self.email:
            raise ValueError("Email is required for non-scout members")
        return self


class FlaggedContentEdits(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    comments: Optional[str] = None
    whatWorked: Optional[str] = None
    whatToChange: Optional[str] = None

    @model_validator(mode="after")
    def at_least_one_field(self):
        values = [self.name, self.description, self.comments, self.whatWorked, self.whatToChange]
        if not any(isinstance(v, str) for v in values):
            raise ValueError("At least one editable field is required")
        return self


class ReviewFlaggedContentApprove(BaseModel):
    action: str = Field("approve", pattern="^approve$")


class ReviewFlaggedContentReject(BaseModel):
    action: str = Field("reject", pattern="^reject$")


class ReviewFlaggedContentEdit(BaseModel):
    action: str = Field("edit", pattern="^edit$")
    edits: FlaggedContentEdits


# Union type for review actions
from typing import Union

ReviewFlaggedContent = Union[
    ReviewFlaggedContentApprove,
    ReviewFlaggedContentReject,
    ReviewFlaggedContentEdit,
]
