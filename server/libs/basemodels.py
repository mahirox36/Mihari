from typing import Any
from pydantic import BaseModel, Field, field_validator


class SaveSettings(BaseModel):
    key: str = Field(description="The Key for the saved Settings")
    value: Any = Field(description="The Value for the saved Settings")

class GetSettings(BaseModel):
    key: str = Field(description="The Key for the saved Settings")
    default: Any = Field(description="The Default Value if not Found")
