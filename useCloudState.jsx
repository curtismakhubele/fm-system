// useCloudState.jsx — like useState, but saved to SharePoint once the user is signed in.
// Works offline: state is cached in localStorage first, and existing local data is uploaded
// the first time a user signs in with nothing saved in the cloud yet.
import { useEffect, useRef, useState } from "react";
import { useIsAuthenticated } from "@azure/msal-react";
import { loadData, saveData } from "./cloud";

export function useCloudState(key, initialValue) {
  const signedIn = useIsAuthenticated();
  const [value, setValue] = useState(() => {
    try {
      const cached = localStorage.getItem(key);
      return cached ? JSON.parse(cached) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const [status, setStatus] = useState("signed-out"); // signed-out | loading | saving | saved | error
  const loaded = useRef(false); // don't save until the cloud copy has been read
  const skipNext = useRef(false); // don't echo a value that just came from the cloud
  const latest = useRef(value);
  const timer = useRef(null);

  // Load from SharePoint after sign-in.
  useEffect(() => {
    if (!signedIn) {
      loaded.current = false;
      setStatus("signed-out");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const cloud = await loadData(key);
        if (cancelled) return;
        if (cloud !== null) {
          skipNext.current = true;
          setValue(cloud);
        } else {
          await saveData(key, latest.current); // first sign-in: upload existing local data
        }
        loaded.current = true;
        setStatus("saved");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [signedIn, key]);

  // Save on change (debounced).
  useEffect(() => {
    latest.current = value;
    localStorage.setItem(key, JSON.stringify(value));
    if (!loaded.current) return;
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveData(key, value).then(() => setStatus("saved")).catch(() => setStatus("error"));
    }, 800);
    return () => clearTimeout(timer.current);
  }, [key, value]);

  return [value, setValue, status];
}

/* ------------------------------------------------------------------
   main.jsx — wrap your app (msal must be initialized before rendering)

   import { createRoot } from "react-dom/client";
   import { MsalProvider } from "@azure/msal-react";
   import { msalInstance } from "./cloud";
   import App from "./App";

   msalInstance.initialize().then(() => {
     const accounts = msalInstance.getAllAccounts();
     if (accounts.length) msalInstance.setActiveAccount(accounts[0]);
     createRoot(document.getElementById("root")).render(
       <MsalProvider instance={msalInstance}><App /></MsalProvider>
     );
   });

   App.jsx — example: sign-in button, saved data, and SharePoint files

   import { useEffect, useState } from "react";
   import { useIsAuthenticated, useMsal } from "@azure/msal-react";
   import { signIn, signOut, uploadFile, listFiles, shareFile } from "./cloud";
   import { useCloudState } from "./useCloudState";

   export default function App() {
     const signedIn = useIsAuthenticated();
     const { accounts } = useMsal();
     const [notes, setNotes, status] = useCloudState("notes", []);
     const [files, setFiles] = useState([]);

     useEffect(() => { if (signedIn) listFiles().then(setFiles); }, [signedIn]);

     async function onUpload(e) {
       const file = e.target.files[0];
       if (!file) return;
       await uploadFile(file);
       setFiles(await listFiles());
     }

     if (!signedIn) return <button onClick={signIn}>Sign in with work or school account</button>;

     return (
       <div>
         <p>Signed in as {accounts[0]?.username} ({status}) <button onClick={signOut}>Sign out</button></p>
         <button onClick={() => setNotes([...notes, { id: Date.now(), text: "New note" }])}>Add note</button>
         <ul>{notes.map((n) => <li key={n.id}>{n.text}</li>)}</ul>

         <input type="file" onChange={onUpload} />
         <ul>
           {files.map((f) => (
             <li key={f.id}>
               <a href={f.webUrl} target="_blank" rel="noreferrer">{f.name}</a>{" "}
               <button onClick={async () => alert(await shareFile(f.id))}>Get share link</button>
             </li>
           ))}
         </ul>
       </div>
     );
   }
------------------------------------------------------------------- */
