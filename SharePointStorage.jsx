import { useCallback, useEffect, useRef, useState } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "./msalConfig";
import { listFiles, uploadFile, deleteFile, getDownloadUrl } from "./sharepointService";

const formatSize = (b) =>
  b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

export default function SharePointStorage() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFiles(await listFiles());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      instance.setActiveAccount(accounts[0]);
      refresh();
    }
  }, [isAuthenticated, instance, accounts, refresh]);

  const signIn = () => instance.loginPopup(loginRequest).catch((e) => setError(e.message));
  const signOut = () => instance.logoutPopup();

  async function handleUpload(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setError("");
    try {
      for (const file of selected) {
        setProgress({ name: file.name, pct: 0 });
        await uploadFile(file, (pct) => setProgress({ name: file.name, pct }));
      }
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDownload(item) {
    try {
      window.open(await getDownloadUrl(item.id), "_blank");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await deleteFile(item.id);
      setFiles((f) => f.filter((x) => x.id !== item.id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!isAuthenticated) {
    return (
      <div>
        <p>Sign in with your work or school account to use cloud storage.</p>
        <button onClick={signIn}>Sign in with Microsoft</button>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span>{accounts[0]?.username}</span>
        <button onClick={() => inputRef.current?.click()} disabled={!!progress}>Upload files</button>
        <button onClick={refresh} disabled={loading}>Refresh</button>
        <button onClick={signOut}>Sign out</button>
        <input ref={inputRef} type="file" multiple hidden onChange={handleUpload} />
      </div>

      {progress && (
        <p aria-live="polite">Uploading {progress.name}: {progress.pct}%</p>
      )}
      {error && <p role="alert" style={{ color: "#b3261e" }}>{error}</p>}

      {loading ? (
        <p>Loading files...</p>
      ) : files.length === 0 ? (
        <p>No files yet. Upload one to get started.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {files.map((f) => (
            <li key={f.id} style={{ display: "flex", gap: 12, padding: "6px 0", alignItems: "center" }}>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
              <span>{formatSize(f.size)}</span>
              <button onClick={() => handleDownload(f)}>Download</button>
              <button onClick={() => handleDelete(f)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
