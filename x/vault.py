"""Encrypted folder bundles for a public repo. Public-key: anyone with the .pub file can seal, only the private key opens.
  python3 x/vault.py seal <folder> <out.enc> <key.pub>
  python3 x/vault.py open <in.enc> <folder>        (private key PEM in env HQ_KEY)
  python3 x/vault.py keygen <out.pub>              (prints the new private key PEM)
ECDH P-256 + HKDF-SHA256 + AES-256-GCM. The bundle is a zip, so file names are encrypted too.
"""
import io, os, sys, zipfile, json, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization

B = lambda x: base64.b64encode(x).decode()
U = base64.b64decode
RAW = (serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)

def kdf(shared):
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=b"hq-vault").derive(shared)

def seal(folder, out, pubfile):
    pub = serialization.load_pem_public_key(open(pubfile, "rb").read())
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(folder):
            for f in files:
                p = os.path.join(root, f)
                z.write(p, os.path.relpath(p, folder))
    eph = ec.generate_private_key(ec.SECP256R1())
    iv = os.urandom(12)
    ct = AESGCM(kdf(eph.exchange(ec.ECDH(), pub))).encrypt(iv, buf.getvalue(), None)
    open(out, "w").write(json.dumps({"e": B(eph.public_key().public_bytes(*RAW)), "i": B(iv), "c": B(ct)}))

def open_(src, folder):
    priv = serialization.load_pem_private_key(os.environ["HQ_KEY"].encode(), None)
    d = json.load(open(src))
    eph = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), U(d["e"]))
    pt = AESGCM(kdf(priv.exchange(ec.ECDH(), eph))).decrypt(U(d["i"]), U(d["c"]), None)
    os.makedirs(folder, exist_ok=True)
    zipfile.ZipFile(io.BytesIO(pt)).extractall(folder)

def keygen(pubfile):
    k = ec.generate_private_key(ec.SECP256R1())
    open(pubfile, "wb").write(k.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
    print(k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode())

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "seal": seal(*sys.argv[2:5])
    elif cmd == "open": open_(*sys.argv[2:4])
    elif cmd == "keygen": keygen(sys.argv[2])
