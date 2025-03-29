import React, { useState, useEffect, useCallback } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { canisterId, createActor } from 'declarations/backend'; // Ensure dfx generate ran

// --- Network & Identity Provider Configuration ---
const network = process.env.DFX_NETWORK || 'local';
const getIdentityProviderUrl = () => {
  if (network === 'ic') {
    return 'https://identity.ic0.app';
  } else if (network === 'playground') {
    const playgroundIIcanisterId = 'rdmx6-jaaaa-aaaaa-aaadq-cai';
    return `http://${playgroundIIcanisterId}.localhost:4943`;
  } else {
    const localIIcanisterId = process.env.CANISTER_ID_INTERNET_IDENTITY || 'rdmx6-jaaaa-aaaaa-aaadq-cai';
    return `http://${localIIcanisterId}.localhost:4943`;
  }
};
const internetIdentityUrl = getIdentityProviderUrl();

// --- Basic Styling (Inline - Move to index.css for cleaner code later) ---
const styles = {
  // General Layout & App Container
  container: { maxWidth: '900px', margin: '2rem auto', padding: '1rem', fontFamily: 'Arial, sans-serif', backgroundColor: '#f0f2f5', borderRadius: '8px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #ccc' },
  title: { fontSize: '1.8rem', color: '#1a2a4d' },
  loading: { textAlign: 'center', padding: '2rem', fontSize: '1.2rem', color: '#555' },
  grid: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem' }, // Sidebar + Main Area
  sidebar: { padding: '1rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ddd', height: 'fit-content' },
  mainArea: { padding: '1rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ddd' },
  sectionTitle: { fontSize: '1.3rem', marginBottom: '1rem', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '0.5rem'},
  button: { padding: '8px 15px', fontSize: '14px', cursor: 'pointer', borderRadius: '4px', border: '1px solid transparent', marginRight: '8px', transition: 'background-color 0.2s ease' },
  primaryButton: { backgroundColor: '#007bff', color: 'white', borderColor: '#007bff', '&:hover': { backgroundColor: '#0056b3' } },
  secondaryButton: { backgroundColor: '#6c757d', color: 'white', borderColor: '#6c757d', '&:hover': { backgroundColor: '#5a6268' } },
  dangerButton: { backgroundColor: '#dc3545', color: 'white', borderColor: '#dc3545', '&:hover': { backgroundColor: '#c82333' } },
  smallButton: { padding: '4px 8px', fontSize: '12px', marginRight: '5px'},
  // Modals
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '5px', minWidth: '300px', maxWidth: '500px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' },
  // Forms
  formGroup: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' },
  input: { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', minHeight: '80px' },
  // Lists
  listItem: { padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer', '&:hover': { backgroundColor: '#f0f0f0' }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  selectedItem: { backgroundColor: '#e0e0e0' },
  needsReview: { borderLeft: '4px solid #ffc107' }, // Highlight for due topics
  // Practice Area
  practiceCard: { border: '1px solid #ccc', padding: '20px', marginBottom: '1rem', minHeight: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', textAlign: 'center' },
  practiceControls: { textAlign: 'center', marginTop: '1rem'},
};

// Simple Modal Component
const Modal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>{title}</h3>
        {children}
        <div style={{ textAlign: 'right', marginTop: '1.5rem' }}>
          <button style={{...styles.button, ...styles.secondaryButton}} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};


// --- App Component ---
function App() {
  // Auth State
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState(null);

  // Loading States
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false); // For backend calls

  // App Data State
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null); // Holds the full Topic object
  const [flashcards, setFlashcards] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);

  // UI State
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showEditCardModal, setShowEditCardModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null); // Holds card being edited

  // Practice Mode State
  const [inPracticeMode, setInPracticeMode] = useState(false);
  const [practiceCards, setPracticeCards] = useState([]);
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [showPracticeAnswer, setShowPracticeAnswer] = useState(false);
  const [practiceCorrectCount, setPracticeCorrectCount] = useState(0);
  const [practiceIncorrectCount, setPracticeIncorrectCount] = useState(0);
  const [practiceCompleteMessage, setPracticeCompleteMessage] = useState('');

  // Form Input State
  const [newTopicName, setNewTopicName] = useState('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [editCardFront, setEditCardFront] = useState('');
  const [editCardBack, setEditCardBack] = useState('');
  const [reminderDate, setReminderDate] = useState(''); // YYYY-MM-DD format

  // --- Initialization ---
  const initAuth = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      const client = await AuthClient.create();
      setAuthClient(client);
      const authenticated = await client.isAuthenticated();
      updateAuthState(client, authenticated);
    } catch (error) {
      console.error("Auth initialization failed:", error);
      alert("Error initializing authentication. Please refresh.");
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const updateAuthState = useCallback((client, authenticated) => {
    setIsAuthenticated(authenticated);
    if (authenticated) {
      const identity = client.getIdentity();
      const userPrincipal = identity.getPrincipal();
      setPrincipal(userPrincipal);
      const backendActor = createActor(canisterId, { agentOptions: { identity } });
      setActor(backendActor);
    } else {
      setPrincipal(null);
      const anonActor = createActor(canisterId, {});
      setActor(anonActor);
      // Clear user-specific data on logout
      setTopics([]);
      setSelectedTopic(null);
      setFlashcards([]);
      setScoreHistory([]);
      setInPracticeMode(false); // Exit practice mode on logout
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // --- Data Fetching ---
  const fetchTopics = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    setIsDataLoading(true);
    console.log("Fetching topics...");
    try {
      const result = await actor.getMyTopics();
       // Convert BigInt timestamps (Motoko Time) to JS milliseconds (Number) for easier use
      const formattedTopics = result.map(topic => ({
        ...topic,
        id: Number(topic.id), // Convert BigInt ID to Number if needed, keep as BigInt if large
        createdAt: Number(topic.createdAt / 1_000_000n),
        nextReview: Number(topic.nextReview / 1_000_000n),
      }));
      setTopics(formattedTopics);
      console.log("Topics fetched:", formattedTopics);
    } catch (error) {
      console.error("Failed to fetch topics:", error);
      alert("Could not fetch your topics.");
    } finally {
      setIsDataLoading(false);
    }
  }, [actor, isAuthenticated]);

  const fetchFlashcards = useCallback(async (topicId) => {
    if (!actor || !isAuthenticated || topicId === null) return;
    setIsDataLoading(true);
    setFlashcards([]); // Clear previous cards
    console.log("Fetching flashcards for topic:", topicId);
    try {
      const result = await actor.getFlashcardsForTopic(BigInt(topicId)); // Ensure ID is BigInt for backend
      if (result && result.length > 0 && result[0] !== null) { // Backend returns ?[Flashcard]
         const formattedCards = result[0].map(card => ({
            ...card,
            id: Number(card.id),
            topicId: Number(card.topicId),
            createdAt: Number(card.createdAt / 1_000_000n),
         }));
         setFlashcards(formattedCards);
         console.log("Flashcards fetched:", formattedCards);
      } else if (result && result.length === 1 && result[0] === null) {
         console.log("Topic exists but has no flashcards.");
         setFlashcards([]); // Explicitly set empty array
      } else {
          console.warn("Topic not found or not authorized to fetch cards, result:", result);
          alert("Could not fetch flashcards for this topic. It might not exist or you don't own it.");
          setSelectedTopic(null); // Deselect topic if fetch fails badly
          setFlashcards([]);
      }
    } catch (error) {
      console.error("Failed to fetch flashcards:", error);
      alert("Error fetching flashcards.");
      setFlashcards([]);
    } finally {
      setIsDataLoading(false);
    }
  }, [actor, isAuthenticated]);

    const fetchScoreHistory = useCallback(async (topicId) => {
    if (!actor || !isAuthenticated || topicId === null) return;
    setIsDataLoading(true);
    setScoreHistory([]);
    console.log("Fetching score history for topic:", topicId);
    try {
      const result = await actor.getScoreHistoryForTopic(BigInt(topicId));
       if (result && result.length > 0 && result[0] !== null) {
         const formattedScores = result[0].map(score => ({
            ...score,
            id: Number(score.id),
            topicId: Number(score.topicId),
            timestamp: Number(score.timestamp / 1_000_000n), // Convert ns to ms
            // Keep counts as Number (assuming they won't exceed JS limits)
            correctCount: Number(score.correctCount),
            incorrectCount: Number(score.incorrectCount),
         })).sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
         setScoreHistory(formattedScores);
         console.log("Score history fetched:", formattedScores);
       } else if (result && result.length === 1 && result[0] === null) {
           console.log("Topic exists but has no score history.");
           setScoreHistory([]);
       }
        else {
          console.warn("Topic not found or not authorized to fetch scores, result:", result);
          // Don't alert here, just show no history
           setScoreHistory([]);
      }
    } catch (error) {
      console.error("Failed to fetch score history:", error);
      alert("Error fetching score history.");
      setScoreHistory([]);
    } finally {
      setIsDataLoading(false);
    }
  }, [actor, isAuthenticated]);


  // Fetch topics on login
  useEffect(() => {
    if (isAuthenticated && actor) {
      fetchTopics();
    }
  }, [isAuthenticated, actor, fetchTopics]);

  // Fetch cards and scores when topic selected
  useEffect(() => {
    if (selectedTopic && actor) {
      fetchFlashcards(selectedTopic.id);
      fetchScoreHistory(selectedTopic.id);
      setInPracticeMode(false); // Exit practice if topic changes
    } else {
        setFlashcards([]); // Clear if no topic selected
        setScoreHistory([]);
    }
  }, [selectedTopic, actor, fetchFlashcards, fetchScoreHistory]);


  // --- Auth Handlers ---
  const login = async () => { /* ... (same as Step 1) ... */
      if (!authClient || isAuthLoading) return;
      setIsAuthLoading(true);
      try {
        await authClient.login({
          identityProvider: internetIdentityUrl,
          onSuccess: async () => {
            const authenticated = await authClient.isAuthenticated();
            updateAuthState(authClient, authenticated);
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
           setIsAuthLoading(false);
      }
   };
  const logout = async () => { /* ... (same as Step 1) ... */
      if (!authClient || isAuthLoading) return;
      setIsAuthLoading(true);
      try {
        await authClient.logout();
        updateAuthState(authClient, false);
        alert('Logged Out Successfully.');
      } catch (error) {
          console.error("Logout failed:", error);
          alert('Logout Error: Failed to logout.');
      } finally {
          setIsAuthLoading(false);
      }
   };


  // --- Topic Handlers ---
  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!actor || !newTopicName.trim()) return;
    setIsDataLoading(true);
    try {
      // Set initial review time to now (or adjust as needed)
      const initialReviewNanos = BigInt(Date.now()) * 1_000_000n;
      const result = await actor.createTopic(newTopicName.trim(), initialReviewNanos);
      if (result && result.length > 0 && result[0]) { // Check Option<Topic>
        alert("Topic created successfully!");
        setNewTopicName('');
        setShowAddTopicModal(false);
        fetchTopics(); // Refresh list
      } else {
        alert("Failed to create topic. Name might be empty or an error occurred.");
      }
    } catch (error) {
      console.error("Create topic error:", error);
      alert("Error creating topic.");
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!actor || !window.confirm(`Are you sure you want to delete topic ${topicId} and all its cards/scores? This cannot be undone.`)) return;
    setIsDataLoading(true);
    try {
      const success = await actor.deleteTopic(BigInt(topicId));
      if (success) {
        alert("Topic deleted successfully.");
        if(selectedTopic?.id === topicId) setSelectedTopic(null); // Deselect if deleted
        fetchTopics(); // Refresh list
      } else {
        alert("Failed to delete topic. You might not own it or it doesn't exist.");
      }
    } catch (error) {
      console.error("Delete topic error:", error);
      alert("Error deleting topic.");
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSelectTopic = (topic) => {
    if (inPracticeMode && !window.confirm("Changing topics will exit practice mode. Continue?")) {
      return;
    }
    setSelectedTopic(topic);
  };


  // --- Flashcard Handlers ---
    const handleAddCard = async (e) => {
    e.preventDefault();
    if (!actor || !selectedTopic || !newCardFront.trim() || !newCardBack.trim()) return;
    setIsDataLoading(true);
    try {
        const result = await actor.createFlashcard(BigInt(selectedTopic.id), newCardFront.trim(), newCardBack.trim());
         if (result && result.length > 0 && result[0]) { // Check Option<Flashcard>
             alert("Flashcard created successfully!");
             setNewCardFront('');
             setNewCardBack('');
             setShowAddCardModal(false);
             fetchFlashcards(selectedTopic.id); // Refresh list
         } else {
            alert("Failed to create flashcard. Check inputs or topic ownership.");
         }
    } catch (error) {
        console.error("Create card error:", error);
        alert("Error creating flashcard.");
    } finally {
        setIsDataLoading(false);
    }
  };

  const openEditCardModal = (card) => {
    setEditingCard(card);
    setEditCardFront(card.front);
    setEditCardBack(card.back);
    setShowEditCardModal(true);
  };

  const handleUpdateCard = async (e) => {
    e.preventDefault();
     if (!actor || !editingCard || !editCardFront.trim() || !editCardBack.trim()) return;
     setIsDataLoading(true);
     try {
        const success = await actor.updateFlashcard(BigInt(editingCard.id), editCardFront.trim(), editCardBack.trim());
        if(success) {
            alert("Flashcard updated successfully!");
            setShowEditCardModal(false);
            setEditingCard(null);
            fetchFlashcards(selectedTopic.id); // Refresh list
        } else {
             alert("Failed to update flashcard. You might not own it or it doesn't exist.");
        }
     } catch (error) {
         console.error("Update card error:", error);
         alert("Error updating flashcard.");
     } finally {
        setIsDataLoading(false);
     }
  };

  const handleDeleteCard = async (cardId) => {
    if (!actor || !window.confirm(`Delete flashcard ${cardId}?`)) return;
    setIsDataLoading(true);
    try {
        const success = await actor.deleteFlashcard(BigInt(cardId));
         if (success) {
            alert("Flashcard deleted successfully.");
            fetchFlashcards(selectedTopic.id); // Refresh list
         } else {
             alert("Failed to delete flashcard. You might not own it or it doesn't exist.");
         }
    } catch (error) {
        console.error("Delete card error:", error);
        alert("Error deleting flashcard.");
    } finally {
        setIsDataLoading(false);
    }
  };


  // --- Practice Mode Handlers ---
  const startPractice = () => {
    if (!selectedTopic || flashcards.length === 0) {
      alert("Select a topic with cards to practice.");
      return;
    }
    // Simple shuffle: sort randomly
    setPracticeCards([...flashcards].sort(() => 0.5 - Math.random()));
    setCurrentPracticeIndex(0);
    setPracticeCorrectCount(0);
    setPracticeIncorrectCount(0);
    setShowPracticeAnswer(false);
    setPracticeCompleteMessage('');
    setInPracticeMode(true);
  };

  const handlePracticeAnswer = (correct) => {
    if (!inPracticeMode) return;

    if(correct) setPracticeCorrectCount(count => count + 1);
    else setPracticeIncorrectCount(count => count + 1);

    // Move to next card or finish
    if (currentPracticeIndex + 1 < practiceCards.length) {
      setCurrentPracticeIndex(index => index + 1);
      setShowPracticeAnswer(false); // Hide answer for next card
    } else {
      // Practice finished
      const finalCorrect = practiceCorrectCount + (correct ? 1 : 0); // Include last answer
      const finalIncorrect = practiceIncorrectCount + (correct ? 0 : 1);
      const total = practiceCards.length;
      setPracticeCompleteMessage(`Practice Complete! Score: ${finalCorrect} / ${total}`);
      setInPracticeMode(false); // Exit practice mode UI
      // Record score in backend
      recordPracticeScore(finalCorrect, finalIncorrect);
    }
  };

    const recordPracticeScore = async (finalCorrect, finalIncorrect) => {
        if (!actor || !selectedTopic) return;
        setIsDataLoading(true); // Indicate backend activity
        try {
            const result = await actor.recordScore(BigInt(selectedTopic.id), BigInt(finalCorrect), BigInt(finalIncorrect));
             if (result && result.length > 0 && result[0] !== null) { // Check Option<ScoreId>
                console.log("Score recorded successfully, ID:", result[0]);
                fetchScoreHistory(selectedTopic.id); // Refresh history display
             } else {
                alert("Failed to record score.");
             }
        } catch(error) {
            console.error("Record score error:", error);
            alert("Error recording score.");
        } finally {
            setIsDataLoading(false);
        }
    };


  // --- Reminder Handler ---
  const handleSetReminder = async (e) => {
    e.preventDefault();
    if (!actor || !selectedTopic || !reminderDate) return;
    setIsDataLoading(true);
    try {
        // Convert YYYY-MM-DD string to timestamp in nanoseconds (use start of day UTC)
        const dateObj = new Date(reminderDate + 'T00:00:00Z');
        const timestampMillis = dateObj.getTime();
        if (isNaN(timestampMillis) || timestampMillis <= Date.now()) {
            alert("Please select a valid future date.");
            setIsDataLoading(false);
            return;
        }
        const timestampNanos = BigInt(timestampMillis) * 1_000_000n;

        const success = await actor.setTopicNextReview(BigInt(selectedTopic.id), timestampNanos);
        if (success) {
            alert("Reminder set successfully!");
            setShowReminderModal(false);
            setReminderDate('');
            fetchTopics(); // Refresh topic list to show updated review time (or update locally)
        } else {
            alert("Failed to set reminder. Topic may not exist or you don't own it.");
        }
    } catch (error) {
        console.error("Set reminder error:", error);
        alert("Error setting reminder.");
    } finally {
        setIsDataLoading(false);
    }
  };


  // --- Render Logic ---
  if (isAuthLoading) {
    return <div style={styles.loading}>Initializing...</div>;
  }

  // Determine current practice card
  const currentCard = inPracticeMode ? practiceCards[currentPracticeIndex] : null;

  return (
    <div style={styles.container}>
      {/* --- Header --- */}
      <header style={styles.header}>
        <h1 style={styles.title}>ICP Flashcards</h1>
        <div>
          {isAuthenticated ? (
            <>
              <span style={{ marginRight: '1rem', fontSize: '12px', color: '#555' }}>
                User: {principal?.toString().substring(0, 5)}...
              </span>
              <button style={{...styles.button, ...styles.secondaryButton}} onClick={logout} disabled={isAuthLoading || isDataLoading}>Logout</button>
            </>
          ) : (
            <button style={{...styles.button, ...styles.primaryButton}} onClick={login} disabled={isAuthLoading}>Login</button>
          )}
        </div>
      </header>

      {/* --- Loading Indicator --- */}
      {isDataLoading && <div style={{ color: '#007bff', marginBottom: '1rem', textAlign: 'center' }}>Loading data...</div>}

      {/* --- Main Content Grid --- */}
      {isAuthenticated ? (
        <div style={styles.grid}>
          {/* --- Sidebar (Topics) --- */}
          <div style={styles.sidebar}>
            <h2 style={styles.sectionTitle}>Topics</h2>
            {topics.length === 0 && <p style={{fontSize: '14px', color: '#666'}}>No topics yet.</p>}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '1rem' }}>
              {topics.map(topic => {
                 const isSelected = selectedTopic?.id === topic.id;
                 const isDue = topic.nextReview <= Date.now();
                 // Combine styles conditionally
                 let itemStyle = {...styles.listItem};
                 if (isSelected) itemStyle = {...itemStyle, ...styles.selectedItem};
                 if (isDue && !isSelected) itemStyle = {...itemStyle, ...styles.needsReview }; // Only add border if not selected

                 return (
                    <li key={topic.id.toString()} style={itemStyle} onClick={() => handleSelectTopic(topic)}>
                       <span style={{ fontWeight: isSelected ? 'bold' : 'normal', flexGrow: 1, marginRight: '10px' }}>
                          {topic.name} {isDue && '🔔'} {/* Simple indicator */}
                       </span>
                       <button
                          style={{...styles.button, ...styles.dangerButton, ...styles.smallButton}}
                          onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }}
                          disabled={isDataLoading}
                       >
                          Del
                       </button>
                    </li>
                );
              })}
            </ul>
            <button style={{...styles.button, ...styles.primaryButton, width: '100%'}} onClick={() => setShowAddTopicModal(true)} disabled={isDataLoading}>+ Add Topic</button>
          </div>

          {/* --- Main Area (Cards, Practice, History) --- */}
          <div style={styles.mainArea}>
            {!selectedTopic ? (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>Select a topic from the left to view flashcards and practice.</p>
            ) : (
              <div>
                 {/* --- Practice Mode --- */}
                 {inPracticeMode ? (
                     <div>
                         <h2 style={styles.sectionTitle}>Practice: {selectedTopic.name} ({currentPracticeIndex + 1} / {practiceCards.length})</h2>
                         <div style={styles.practiceCard}>
                           {currentCard ? (showPracticeAnswer ? currentCard.back : currentCard.front) : 'Loading card...'}
                         </div>
                         <div style={styles.practiceControls}>
                           {!showPracticeAnswer ? (
                             <button style={{...styles.button, ...styles.primaryButton}} onClick={() => setShowPracticeAnswer(true)}>Show Answer</button>
                           ) : (
                             <>
                               <button style={{...styles.button, backgroundColor: '#28a745', color: 'white'}} onClick={() => handlePracticeAnswer(true)}>Correct</button>
                               <button style={{...styles.button, ...styles.dangerButton}} onClick={() => handlePracticeAnswer(false)}>Incorrect</button>
                             </>
                           )}
                           <button style={{...styles.button, ...styles.secondaryButton, marginLeft: '20px'}} onClick={() => setInPracticeMode(false)}>Exit Practice</button>
                         </div>
                     </div>
                 ) : (
                    <>
                        {/* --- Topic Header & Actions --- */}
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                           <h2 style={styles.sectionTitle} title={`ID: ${selectedTopic.id}`}>Topic: {selectedTopic.name}</h2>
                           <div>
                                {flashcards.length > 0 &&
                                    <button style={{...styles.button, ...styles.primaryButton}} onClick={startPractice} disabled={isDataLoading}>Start Practice</button>
                                }
                               <button style={{...styles.button, ...styles.secondaryButton}} onClick={() => setShowReminderModal(true)} disabled={isDataLoading}>Set Reminder</button>
                           </div>
                        </div>
                        {practiceCompleteMessage && <p style={{color: 'green', fontWeight: 'bold', marginBottom: '1rem'}}>{practiceCompleteMessage}</p>}


                        {/* --- Flashcard List --- */}
                        <h3 style={{fontSize: '1.1rem', color: '#444', marginBottom: '0.5rem'}}>Flashcards ({flashcards.length})</h3>
                         {flashcards.length === 0 && <p style={{fontSize: '14px', color: '#666'}}>No flashcards in this topic yet.</p>}
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee' }}>
                            {flashcards.map(card => (
                                <li key={card.id.toString()} style={{...styles.listItem, cursor: 'default'}}>
                                   <div style={{flexGrow: 1, marginRight: '10px'}}>
                                       <strong style={{display: 'block', fontSize: '14px'}}>Front:</strong> <span style={{fontSize: '14px'}}>{card.front}</span>
                                       <strong style={{display: 'block', fontSize: '14px', marginTop:'4px'}}>Back:</strong> <span style={{fontSize: '14px'}}>{card.back}</span>
                                   </div>
                                   <div>
                                      <button style={{...styles.button, ...styles.secondaryButton, ...styles.smallButton}} onClick={() => openEditCardModal(card)} disabled={isDataLoading}>Edit</button>
                                      <button style={{...styles.button, ...styles.dangerButton, ...styles.smallButton}} onClick={() => handleDeleteCard(card.id)} disabled={isDataLoading}>Del</button>
                                   </div>
                                </li>
                            ))}
                        </ul>
                        <button style={{...styles.button, ...styles.primaryButton}} onClick={() => setShowAddCardModal(true)} disabled={isDataLoading}>+ Add Flashcard</button>

                        <hr style={{margin: '2rem 0'}}/>

                        {/* --- Score History --- */}
                        <h3 style={{fontSize: '1.1rem', color: '#444', marginBottom: '0.5rem'}}>Score History</h3>
                         {scoreHistory.length === 0 && <p style={{fontSize: '14px', color: '#666'}}>No practice sessions recorded yet.</p>}
                        <ul style={{listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee'}}>
                             {scoreHistory.map(score => (
                                 <li key={score.id.toString()} style={{...styles.listItem, cursor: 'default', fontSize: '14px'}}>
                                     <span>{new Date(score.timestamp).toLocaleString()}</span>
                                     <span>Score: {score.correctCount} / {score.correctCount + score.incorrectCount}</span>
                                 </li>
                             ))}
                        </ul>
                    </>
                 )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>Please log in to manage your flashcards.</p>
      )}


      {/* --- Modals --- */}
      {/* Add Topic Modal */}
      <Modal show={showAddTopicModal} onClose={() => setShowAddTopicModal(false)} title="Add New Topic">
        <form onSubmit={handleAddTopic}>
          <div style={styles.formGroup}>
            <label htmlFor="topicName" style={styles.label}>Topic Name:</label>
            <input
              type="text"
              id="topicName"
              style={styles.input}
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              required
              disabled={isDataLoading}
            />
          </div>
          <button type="submit" style={{...styles.button, ...styles.primaryButton}} disabled={isDataLoading || !newTopicName.trim()}>Save Topic</button>
        </form>
      </Modal>

      {/* Add Card Modal */}
      <Modal show={showAddCardModal} onClose={() => setShowAddCardModal(false)} title={`Add Card to "${selectedTopic?.name}"`}>
         <form onSubmit={handleAddCard}>
             <div style={styles.formGroup}>
                <label htmlFor="cardFront" style={styles.label}>Front:</label>
                <textarea id="cardFront" style={styles.textarea} value={newCardFront} onChange={(e) => setNewCardFront(e.target.value)} required disabled={isDataLoading}></textarea>
            </div>
             <div style={styles.formGroup}>
                <label htmlFor="cardBack" style={styles.label}>Back:</label>
                <textarea id="cardBack" style={styles.textarea} value={newCardBack} onChange={(e) => setNewCardBack(e.target.value)} required disabled={isDataLoading}></textarea>
            </div>
            <button type="submit" style={{...styles.button, ...styles.primaryButton}} disabled={isDataLoading || !newCardFront.trim() || !newCardBack.trim()}>Save Card</button>
         </form>
      </Modal>

      {/* Edit Card Modal */}
      <Modal show={showEditCardModal} onClose={() => { setShowEditCardModal(false); setEditingCard(null); }} title={`Edit Card (ID: ${editingCard?.id})`}>
         <form onSubmit={handleUpdateCard}>
             <div style={styles.formGroup}>
                <label htmlFor="editCardFront" style={styles.label}>Front:</label>
                <textarea id="editCardFront" style={styles.textarea} value={editCardFront} onChange={(e) => setEditCardFront(e.target.value)} required disabled={isDataLoading}></textarea>
            </div>
             <div style={styles.formGroup}>
                <label htmlFor="editCardBack" style={styles.label}>Back:</label>
                <textarea id="editCardBack" style={styles.textarea} value={editCardBack} onChange={(e) => setEditCardBack(e.target.value)} required disabled={isDataLoading}></textarea>
            </div>
            <button type="submit" style={{...styles.button, ...styles.primaryButton}} disabled={isDataLoading || !editCardFront.trim() || !editCardBack.trim()}>Update Card</button>
         </form>
      </Modal>

      {/* Set Reminder Modal */}
       <Modal show={showReminderModal} onClose={() => setShowReminderModal(false)} title={`Set Reminder for "${selectedTopic?.name}"`}>
         <form onSubmit={handleSetReminder}>
             <div style={styles.formGroup}>
                <label htmlFor="reminderDate" style={styles.label}>Next Review Date:</label>
                 <input
                    type="date"
                    id="reminderDate"
                    style={styles.input}
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    required
                    disabled={isDataLoading}
                    min={new Date().toISOString().split('T')[0]} // Prevent past dates
                 />
             </div>
             <button type="submit" style={{...styles.button, ...styles.primaryButton}} disabled={isDataLoading || !reminderDate}>Set Reminder</button>
         </form>
       </Modal>

    </div>
  );
}

export default App;