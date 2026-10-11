"""Authorized web-research boundary.

Live search stays unavailable unless a server-side search key is configured.
URL checks reject private-network targets before any fetch is attempted.
"""

import ipaddress
import os
import socket
from urllib.parse import urlparse


def research_available() -> bool:
    return bool(os.environ.get("VIRTUARA_SEARCH_API_KEY", "").strip())


def validate_public_url(url: str) -> str:
    parsed = urlparse((url or "").strip())
    host = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme not in {"http", "https"} or not host or parsed.username or parsed.password:
        raise ValueError("Only public http(s) URLs are allowed.")
    if host in {"localhost", "metadata.google.internal"} or host.endswith(".local"):
        raise ValueError("That address is not allowed.")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError("The host could not be resolved.") from exc
    for info in addresses:
        ip = ipaddress.ip_address(info[4][0])
        if any((
            ip.is_private,
            ip.is_loopback,
            ip.is_link_local,
            ip.is_reserved,
            ip.is_multicast,
            ip.is_unspecified,
        )):
            raise ValueError("Private network addresses are not allowed.")
    return parsed.geturl()
