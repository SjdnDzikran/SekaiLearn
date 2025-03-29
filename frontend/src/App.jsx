import React, { useState, useEffect, useCallback } from 'react';
import { AuthClient } from '@dfinity/auth-client';
// Import canister definitions and actor creation function
// Make sure you run 'dfx generate backend' after updating the backend
import { canisterId, createActor } from 'declarations/backend';

// Define network and identity provider based on environment
// Note: Ensure DFX_NETWORK and CANISTER_ID_INTERNET_IDENTITY are available in your environment
// DFX injects these when running `dfx deploy` or `npm run dev` if configured in dfx.json / vite config
const network = process.env.DFX_NETWORK || 'local'; // Read from .env, default to local

// Determine the Internet Identity URL based on the network
const getIdentityProviderUrl = () => {
  if (network === 'ic') {
    // Production environment on the mainnet
    return 'https://identity.ic0.app';
  } else if (network === 'playground') {
    // ICP Ninja Playground or similar environment using a fixed II canister ID
    // Note: ICP Ninja proxy handles the port mapping, so we use the canister ID directly
    // in the URL format expected by AuthClient for local/dev networks.
    // The actual II canister ID provided by ICP Ninja playground.
    const playgroundIIcanisterId = 'rdmx6-jaaaa-aaaaa-aaadq-cai'; // Standard II dev canister ID
    // The playground likely serves II via its proxy, construct the URL accordingly
    // Assuming the playground proxy exposes it at the standard port 4943 or handles it.
    // AuthClient expects this format for non-mainnet: http://<canister_id>.localhost:<port>
    // We rely on the playground environment's specific setup here. Check playground docs if needed.
    // Using the standard port 4943 as a default assumption for local dev environments.
    return `http://${playgroundIIcanisterId}.localhost:4943`;
  } else {
    // Standard local development network using dfx start
    // Use the environment variable if provided by dfx, otherwise default
    const localIIcanisterId = process.env.CANISTER_ID_INTERNET_IDENTITY || 'rdmx6-jaaaa-aaaaa-aaadq-cai';
    return `http://${localIIcanisterId}.localhost:4943`;
  }
};

const internetIdentityUrl = getIdentityProviderUrl();
// --- Basic Styling (Inline for now, move to CSS later) ---
const styles = {
  container: { maxWidth: '800px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' },
  title: { fontSize: '1.8rem', color: '#333' },
  button: { padding: '0.6rem 1rem', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid transparent', marginRight: '0.5rem' },
  primaryButton: { backgroundColor: '#007bff', color: 'white', borderColor: '#007bff' },
  secondaryButton: { backgroundColor: '#6c757d', color: 'white', borderColor: '#6c757d' },
  ghostButton: { backgroundColor: 'transparent', color: '#6c757d', border: '1px solid #ddd'},
  userInfo: { marginTop: '1rem', padding: '1rem', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '4px', wordBreak: 'break-all' },
  loading: { textAlign: 'center', padding: '2rem', fontSize: '1.2rem', color: '#555' }
};

// --- App Component ---
const App = () => {
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null); // Actor for backend interaction
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState(null); // User's principal
  const [isLoading, setIsLoading] = useState(true); // For initial loading and auth actions
  const [whoamiResult, setWhoamiResult] = useState(''); // To display whoami result

  // --- Initialize AuthClient ---
  const initAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = await AuthClient.create();
      setAuthClient(client);
      const authenticated = await client.isAuthenticated();
      updateAuthState(client, authenticated);
    } catch (error) {
      console.error("Auth initialization failed:", error);
      // Consider showing an error message to the user
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed for initial creation

  // --- Helper to Update Auth State ---
  const updateAuthState = useCallback(async (client, authenticated) => {
    setIsAuthenticated(authenticated);
    if (authenticated) {
      const identity = client.getIdentity();
      const userPrincipal = identity.getPrincipal();
      setPrincipal(userPrincipal);
      // Create actor with the user's identity
      const backendActor = createActor(canisterId, {
        agentOptions: { identity },
      });
      setActor(backendActor);
      setWhoamiResult(''); // Clear previous whoami result on login
    } else {
      setPrincipal(null);
      // Create anonymous actor (can call query methods)
      const anonActor = createActor(canisterId, {});
      setActor(anonActor);
      setWhoamiResult(''); // Clear whoami result on logout
    }
  }, []); // Depends only on createActor/canisterId (effectively constant)

  // --- Run initAuth on component mount ---
  useEffect(() => {
    initAuth();
  }, [initAuth]);


  // --- Authentication Handlers ---
  const login = async () => {
    if (!authClient || isLoading) return;
    setIsLoading(true);
    try {
      await authClient.login({
        identityProvider: internetIdentityUrl,
        onSuccess: async () => {
          const authenticated = await authClient.isAuthenticated();
          updateAuthState(authClient, authenticated);
          // Add a success message if needed (e.g., using alert or a dedicated UI element)
          alert('Login Successful!');
        },
        onError: (error) => {
          console.error("Login failed:", error);
          alert(`Login Failed: ${error || 'Unknown error'}`);
        },
      });
    } catch (error) {
        console.error("Login exception:", error);
        alert('Login Error: An unexpected error occurred.');
    } finally {
         setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!authClient || isLoading) return;
    setIsLoading(true);
    try {
      await authClient.logout();
      // updateAuthState will be called implicitly if logout succeeds,
      // but we can call it explicitly for immediate UI update
      updateAuthState(authClient, false);
      alert('Logged Out Successfully.');
    } catch (error) {
        console.error("Logout failed:", error);
        alert('Logout Error: Failed to logout.');
    } finally {
        setIsLoading(false);
    }
  };

  // --- Backend Interaction ---
  const whoami = async () => {
    if (!actor || isLoading) {
       alert('Actor not ready or still loading.');
       return;
    }
    setIsLoading(true);
    setWhoamiResult('Loading...');
    try {
        const result = await actor.whoami();
        setWhoamiResult(`Principal from backend: ${result.toString()}`);
    } catch(error) {
        console.error("Whoami call failed:", error);
        setWhoamiResult(`Error calling whoami: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Logic ---
  if (isLoading && !authClient) { // Show initial loading only before authClient is created
    return <div style={styles.loading}>Initializing Authentication...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>ICP Flashcard App</h1>
        <div>
          {isAuthenticated ? (
            <button style={{...styles.button, ...styles.secondaryButton}} onClick={logout} disabled={isLoading}>Logout</button>
          ) : (
            <button style={{...styles.button, ...styles.primaryButton}} onClick={login} disabled={isLoading}>Login with Internet Identity</button>
          )}
        </div>
      </header>

      {isLoading && <div style={{color: '#555', marginBottom: '1rem'}}>Processing...</div>}

      {isAuthenticated ? (
        <div style={styles.userInfo}>
          <p><strong>Logged In!</strong></p>
          <p>Your Principal ID: <strong style={{fontSize: '0.9em'}}>{principal?.toString()}</strong></p>
        </div>
      ) : (
        <p>Please log in to manage your flashcards.</p>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <button style={{...styles.button, ...styles.ghostButton}} onClick={whoami} disabled={isLoading || !actor}>
          Call Backend `whoami()`
        </button>
        {whoamiResult && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.9em', color: '#333', backgroundColor: '#eee', padding: '0.5rem', borderRadius: '4px' }}>
            {whoamiResult}
          </p>
        )}
      </div>

      {/* Placeholder for future content */}
      <div style={{marginTop: '2rem', paddingTop: '1rem', borderTop: '1px dashed #ccc'}}>
         <p style={{color: '#777'}}><i>(Topic and flashcard management will appear here)</i></p>
      </div>

    </div>
  );
};

export default App;