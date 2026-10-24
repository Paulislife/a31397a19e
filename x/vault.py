"""Encrypted folder bundles for a public repo.
  python3 x/vault.py seal  <folder> <out.enc>   (passphrase from env HQ_PASS)
  python3 x/vault.py open  <in.enc>  <folder>
AES-256-GCM, key = PBKDF2-SHA256(passphrase, random salt, 600k iterations). The bundle is a zip, so file names
are encrypted too.
"""
import io, os, sys, zipfile, json, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITER = 600000

def key(pw, salt):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(pw.encode())

def seal(folder, out, pw):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(folder):
            for f in files:
                p = os.path.join(root, f)
                z.write(p, os.path.relpath(p, folder))
    salt, iv = os.urandom(16), os.urandom(12)
    ct = AESGCM(key(pw, salt)).encrypt(iv, buf.getvalue(), None)
    open(out, "w").write(json.dumps({"s": base64.b64encode(salt).decode(), "i": base64.b64encode(iv).decode(),
                                     "c": base64.b64encode(ct).decode()}))

def open_(src, folder, pw):
    d = json.load(open(src))
    pt = AESGCM(key(pw, base64.b64decode(d["s"]))).decrypt(base64.b64decode(d["i"]), base64.b64decode(d["c"]), None)
    os.makedirs(folder, exist_ok=True)
    zipfile.ZipFile(io.BytesIO(pt)).extractall(folder)

if __name__ == "__main__":
    pw = os.environ["HQ_PASS"]
    cmd, a, b = sys.argv[1:4]
    (seal if cmd == "seal" else open_)(a, b, pw)
