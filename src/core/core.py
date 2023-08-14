from functools import cached_property
from ipaddress import (
    IPv4Address,
    IPv4Network,
    IPv6Address,
    IPv6Network,
    ip_address,
    ip_network,
)
from os import sep
from os.path import join
from pathlib import Path
from sys import path as sys_path
from typing import Dict, List, Literal, Optional, Union

for deps_path in [
    join(sep, "usr", "share", "bunkerweb", *paths)
    for paths in (("deps", "python"), ("utils",))
]:
    if deps_path not in sys_path:
        sys_path.append(deps_path)

from fastapi import FastAPI
from pydantic import BaseModel, Field
from uvicorn.workers import UvicornWorker

from yaml_base_settings import YamlBaseSettings, YamlSettingsConfigDict  # type: ignore (present in /usr/share/bunkerweb/utils/)


class ApiConfig(YamlBaseSettings):
    LISTEN_ADDR: str = "0.0.0.0"
    LISTEN_PORT: int = 1337
    WAIT_RETRY_INTERVAL: int = 5
    CHECK_WHITELIST: str = "yes"
    WHITELIST: str = "127.0.0.1"
    CHECK_TOKEN: str = "yes"
    TOKEN: str = "changeme"
    MQ_URI: str = "filesystem:////var/lib/bunkerweb/mq"
    BUNKERWEB_INSTANCES: str = ""

    LOG_LEVEL: str = "info"
    DATABASE_URI: str = "sqlite:////var/lib/bunkerweb/db.sqlite3"
    EXTERNAL_PLUGIN_URLS: str = ""
    KUBERNETES_MODE: str = "no"
    SWARM_MODE: str = "no"
    AUTOCONF_MODE: str = "no"

    # The reading order is:
    # 1. Environment variables
    # 2. YAML file
    # 3. .env file
    # 4. Default values
    model_config = YamlSettingsConfigDict(
        yaml_file=join(sep, "etc", "bunkerweb", "config.yaml"),
        env_file=join(sep, "etc", "bunkerweb", "core.conf"),
        env_file_encoding="utf-8",
        extra="allow",
    )

    @cached_property
    def log_level(self) -> str:
        return self.LOG_LEVEL.upper()

    @cached_property
    def check_whitelist(self) -> bool:
        return self.CHECK_WHITELIST.lower() == "yes"

    @cached_property
    def check_token(self) -> bool:
        return self.CHECK_TOKEN.lower() == "yes"

    @cached_property
    def kubernetes_mode(self) -> bool:
        return self.KUBERNETES_MODE.lower() == "yes"

    @cached_property
    def swarm_mode(self) -> bool:
        return self.SWARM_MODE.lower() == "yes"

    @cached_property
    def autoconf_mode(self) -> bool:
        return self.AUTOCONF_MODE.lower() == "yes"

    @cached_property
    def whitelist(
        self,
    ) -> List[Union[IPv4Address, IPv6Address, IPv4Network, IPv6Network]]:
        tmp_whitelist = self.WHITELIST.split(" ")
        whitelist = []

        for ip in tmp_whitelist:
            if not ip:
                continue

            try:
                if "/" in ip:
                    whitelist.append(ip_network(ip))
                else:
                    whitelist.append(ip_address(ip))
            except ValueError:
                continue

        return whitelist

    @cached_property
    def integration(self) -> str:
        if self.kubernetes_mode:
            return "Kubernetes"
        elif self.swarm_mode:
            return "Swarm"
        elif self.autoconf_mode:
            return "Autoconf"

        integration_path = Path(sep, "usr", "share", "bunkerweb", "INTEGRATION")
        os_release_path = Path(sep, "etc", "os-release")
        if integration_path.is_file():
            return integration_path.read_text(encoding="utf-8").strip()
        elif os_release_path.is_file() and "Alpine" in os_release_path.read_text(
            encoding="utf-8"
        ):
            return "Docker"

        return "Linux"


if __name__ == "__main__":
    from json import dumps
    from os import _exit, environ

    api_config = ApiConfig("core", **environ)
    data = {
        "listen_addr": api_config.LISTEN_ADDR,
        "listen_port": api_config.LISTEN_PORT,
        "log_level": api_config.LOG_LEVEL,
        "kubernetes_mode": api_config.kubernetes_mode,
        "swarm_mode": api_config.swarm_mode,
        "autoconf_mode": api_config.autoconf_mode,
    }

    print(dumps(data), flush=True)
    _exit(0)


class BwUvicornWorker(UvicornWorker):
    CONFIG_KWARGS = {
        "loop": "auto",
        "http": "auto",
        "proxy_headers": False,
        "server_header": False,
        "date_header": False,
    }


BUNKERWEB_VERSION = (
    Path(sep, "usr", "share", "bunkerweb", "VERSION")
    .read_text(encoding="utf-8")
    .strip()
)

description = """# BunkerWeb Internal API Documentation

The BunkerWeb Internal API is designed to manage BunkerWeb's instances, communicate with a Database, and interact with various BunkerWeb services, including the scheduler, autoconf, and Web UI. This API provides the necessary endpoints for performing operations related to instance management, database communication, and service interaction.

## Authentication

If the API is configured to check the authentication token, the token must be provided in the request header. Each request should include an authentication token in the request header. The token can be set in the configuration file or as an environment variable (`API_TOKEN`).

Example:

```
Authorization: Bearer YOUR_AUTH_TOKEN
```

## Whitelist

If the API is configured to check the whitelist, the IP address of the client must be in the whitelist. The whitelist can be set in the configuration file or as an environment variable (`API_WHITELIST`). The whitelist can contain IP addresses and/or IP networks.
"""

tags_metadata = [  # TODO: Add more tags and better descriptions: https://fastapi.tiangolo.com/tutorial/metadata/?h=swagger#metadata-for-tags
    {
        "name": "misc",
        "description": "Miscellaneous operations",
    },
    {
        "name": "instances",
        "description": "Operations related to instance management",
    },
    {
        "name": "plugins",
        "description": "Operations related to plugin management",
    },
    {
        "name": "jobs",
        "description": "Operations related to job management",
    },
]

app = FastAPI(
    title="BunkerWeb API",
    description=description,
    summary="The API used by BunkerWeb to communicate with the database and the instances",
    version=BUNKERWEB_VERSION,
    contact={
        "name": "BunkerWeb Team",
        "url": "https://bunkerweb.io",
        "email": "contact@bunkerity.com",
    },
    license_info={
        "name": "GNU Affero General Public License v3.0",
        "identifier": "AGPL-3.0",
        "url": "https://github.com/bunkerity/bunkerweb/blob/master/LICENSE.md",
    },
    openapi_tags=tags_metadata,
)


class Instance(BaseModel):
    hostname: str = Field(examples=["bunkerweb-1"])
    port: int = Field(examples=[5000])
    server_name: str = Field(examples=["bwapi"])

    def to_dict(self):
        return {
            "hostname": self.hostname,
            "port": self.port,
            "server_name": self.server_name,
        }


class Plugin(BaseModel):
    id: str = Field(examples=["blacklist"])
    name: str = Field(examples=["Blacklist"])
    description: str = Field(
        examples=[
            "Deny access based on internal and external IP/network/rDNS/ASN blacklists."
        ]
    )
    version: str = Field(examples=["1.0"])
    stream: str = Field(examples=["partial"])
    settings: Dict[
        str,
        Dict[
            Literal[
                "context",
                "default",
                "help",
                "id",
                "regex",
                "type",
                "select",
                "multiple",
            ],
            str,
        ],
    ] = Field(
        examples=[
            {
                "USE_BLACKLIST": {
                    "context": "multisite",
                    "default": "yes",
                    "help": "Activate blacklist feature.",
                    "id": "use-blacklist",
                    "label": "Activate blacklisting",
                    "regex": "^(yes|no)$",
                    "type": "check",
                }
            }
        ]
    )
    jobs: List[
        Dict[Literal["name", "file", "every", "reload"], Union[str, bool]]
    ] = Field(
        None,
        examples=[
            [
                {
                    "name": "blacklist-download",
                    "file": "blacklist-download.py",
                    "every": "hour",
                    "reload": True,
                }
            ]
        ],
    )


class ErrorMessage(BaseModel):
    message: str


class CacheFileModel(BaseModel):
    service_id: Optional[str] = None


class CacheFileDataModel(CacheFileModel):
    with_info: bool = False
    with_data: bool = True


class CacheFileInfoModel(CacheFileModel):
    checksum: Optional[str] = None