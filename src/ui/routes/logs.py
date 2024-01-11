# -*- coding: utf-8 -*-
from flask import Blueprint
from flask_jwt_extended import jwt_required

from hook import hooks

from utils import get_core_format_res
from os import environ
from ui import UiConfig


UI_CONFIG = UiConfig("ui", **environ)

CORE_API = UI_CONFIG.CORE_ADDR
PREFIX = "/api/logs"

logs = Blueprint("logs", __name__)


@logs.route(f"{PREFIX}/ui", methods=["GET"])
@jwt_required()
@hooks(hooks=["BeforeReqAPI", "AfterReqAPI"])
def get_logs_ui():
    """Get logs ui"""
    return get_core_format_res(f"{CORE_API}/logs/ui", "GET", "", "Retrieve ui logs")


@logs.route(f"{PREFIX}/core", methods=["GET"])
@jwt_required()
@hooks(hooks=["BeforeReqAPI", "AfterReqAPI"])
def get_logs_core():
    """Get logs core"""
    return get_core_format_res(f"{CORE_API}/logs/core", "GET", "", "Retrieve core logs")