from typing import Any, Optional
from pydantic import BaseModel, Field


class SaveSettings(BaseModel):
    key: str = Field(description="The Key for the saved Settings")
    value: Any = Field(description="The Value for the saved Settings")


class GetSettings(BaseModel):
    key: str = Field(description="The Key for the saved Settings")
    default: Any = Field(description="The Default Value if not Found")


class Preset(BaseModel):
    uuid: Optional[str] = Field(description="The UUID for the saved Preset")
    name: str = Field(description="The Name for the saved Preset")
    description: str = Field(description="The Description for the saved Preset")
    config: dict = Field(description="The Download Config for the saved Preset")


class PresetExport(BaseModel):
    uuid: str = Field(description="The UUID for the saved Preset")
    path: str = Field(description="The Path for the imported/exported Preset")


class PresetPath(BaseModel):
    path: str = Field(description="The Path for the imported/exported Preset")
