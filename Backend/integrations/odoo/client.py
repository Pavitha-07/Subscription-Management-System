"""The only module that talks to Odoo (rule 6). XML-RPC external API, Odoo 18."""
import http.client
import time
import xmlrpc.client
from functools import lru_cache

from django.conf import settings


class OdooError(Exception):
    pass


class OdooUnavailable(OdooError):
    """Network/timeout/5xx: callers mark the record `pending` and move on."""


class OdooValidationError(OdooError):
    """Odoo rejected the call (Fault, bad credentials): retrying will not help."""


def _transport(url, timeout):
    base = xmlrpc.client.SafeTransport if url.startswith("https") else xmlrpc.client.Transport

    class _T(base):
        def make_connection(self, host):
            conn = super().make_connection(host)
            conn.timeout = timeout
            return conn

    return _T()


class OdooClient:
    def __init__(self, url, db, user, password, timeout=10, retries=2):
        self.db, self.user, self.password, self.retries = db, user, password, retries
        kw = {"transport": _transport(url, timeout), "allow_none": True}
        self._common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common", **kw)
        self._object = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object", **kw)
        self._uid = None

    def _call(self, fn, *args):
        for attempt in range(self.retries + 1):
            try:
                return fn(*args)
            except xmlrpc.client.Fault as e:
                raise OdooValidationError(e.faultString) from e
            except (OSError, http.client.HTTPException, xmlrpc.client.ProtocolError, xmlrpc.client.ResponseError) as e:
                if attempt == self.retries:
                    raise OdooUnavailable(str(e)) from e
                time.sleep(0.5 * 2**attempt)

    def version(self):
        return self._call(self._common.version)

    @property
    def uid(self):
        if self._uid is None:
            uid = self._call(self._common.authenticate, self.db, self.user, self.password, {})
            if not uid:
                raise OdooValidationError("Odoo authentication failed (check ODOO_DB/USER/PASSWORD)")
            self._uid = uid
        return self._uid

    def execute(self, model, method, *args, **kwargs):
        return self._call(
            self._object.execute_kw, self.db, self.uid, self.password, model, method, list(args), kwargs
        )

    def search_read(self, model, domain=None, fields=None, limit=None):
        kw = {"fields": fields or []}
        if limit:
            kw["limit"] = limit
        return self.execute(model, "search_read", domain or [], **kw)

    def create(self, model, vals):
        return self.execute(model, "create", vals)

    def write(self, model, ids, vals):
        return self.execute(model, "write", ids, vals)

    def unlink(self, model, ids):
        return self.execute(model, "unlink", ids)

    def fields_get(self, model, attributes=("string", "type", "required", "relation", "selection")):
        return self.execute(model, "fields_get", attributes=list(attributes))


@lru_cache(maxsize=1)
def get_client():
    return OdooClient(settings.ODOO_URL, settings.ODOO_DB, settings.ODOO_USER, settings.ODOO_PASSWORD)
