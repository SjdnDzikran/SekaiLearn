import React, { useState, useEffect, useCallback } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { canisterId, createActor } from 'declarations/backend'; // Ensure dfx generate ran
import logoImage from '../logo.webp'; // Make sure this path is correct

// --- Network & Identity Provider Configuration ---
const network = process.env.DFX_NETWORK || 'local';
const getIdentityProviderUrl = () => {
  if (network === 'ic') {
    return 'https://identity.ic0.app';
  } else if (network === 'playground') {
    const playgroundIIcanisterId = 'rdmx6-jaaaa-aaaaa-aaadq-cai'; // Example, replace if needed
    return `http://${playgroundIIcanisterId}.localhost:4943`;
  } else {
    const localIIcanisterId = process.env.CANISTER_ID_INTERNET_IDENTITY || 'rdmx6-jaaaa-aaaaa-aaadq-cai'; // Example, replace if needed
    return `http://${localIIcanisterId}.localhost:4943`;
  }
};
const internetIdentityUrl = getIdentityProviderUrl();

// --- Theme Colors (Updated) ---
const theme = {
  primaryBackground: '#FFF1E0', // Main beige color
  secondaryBackground: '#FCFCFC', // Slightly off-white for main areas/contrast
  cardComplementary: '#E0F7FA', // Soft light cyan/blue for cards
  accentColor: '#E1796B', // Warm accent
  accentHover: '#D36A5C', // Darker accent for hover
  primaryText: '#4E342E', // Darker brown for primary text on light backgrounds
  secondaryText: '#795548', // Lighter brown/gray
  textOnPrimary: '#4E342E', // Text color for elements on the primary background (ensure contrast)
  textOnComplementary: '#004D40', // Dark teal text for on card background
  borderColor: '#EAE0D5', // Soft border color
  sidebarHover: '#EADDCB', // Hover for sidebar items (on primary bg)
  sidebarSelected: '#DBCAB9', // Selected item in sidebar (on primary bg)
  dangerColor: '#dc3545',
  dangerHover: '#c82333',
  successColor: '#28a745',
  infoColor: '#007bff',
  infoHover: '#0056b3',
  cardShadow: '0 2px 6px rgba(78, 52, 46, 0.1)', // Shadow using primary text color base
};

// --- Styling (Inline - Refactored for new design & colors) ---
const styles = {
  // General Layout & App Container
  appWrapper: { margin: 0, padding: 0, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', backgroundColor: theme.secondaryBackground /* Default bg */ },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem', color: theme.primaryText, backgroundColor: theme.primaryBackground },
  globalLoadingIndicator: { position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: theme.accentColor, color: 'white', padding: '5px 10px', borderRadius: '4px', zIndex: 1050, fontSize: '12px' },

  // Landing Page Styles (Updated Colors)
  landingPageContainer: { display: 'flex', minHeight: '100vh' },
  landingLeft: { // NOW uses primary theme color
    flex: 1,
    backgroundColor: theme.primaryBackground, // Use the main theme color here
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem',
    color: theme.primaryText, // Use dark text for contrast
    textAlign: 'center',
  },
  landingLogo: { width: '150px', height: 'auto', marginBottom: '2rem' },
  landingHeadline: { fontSize: '2.8rem', fontWeight: 'bold', marginBottom: '1rem', color: theme.primaryText }, // Dark text
  landingDescription: { fontSize: '1.1rem', maxWidth: '500px', lineHeight: '1.6', color: theme.secondaryText }, // Slightly lighter dark text
  landingRight: { // NOW uses white/off-white
    flex: 1,
    backgroundColor: theme.secondaryBackground, // Use off-white here
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem',
  },
  landingLoginBox: {
    backgroundColor: theme.secondaryBackground, // Keep white box, maybe add border
    padding: '2.5rem',
    borderRadius: '8px',
    boxShadow: theme.cardShadow,
    textAlign: 'center',
    width: '100%',
    maxWidth: '400px',
    border: `1px solid ${theme.borderColor}` // Add subtle border
  },
  landingLoginTitle: { fontSize: '1.5rem', color: theme.primaryText, marginBottom: '1rem', fontWeight: 'bold' },
  landingLoginSubtitle: { fontSize: '0.9rem', color: theme.secondaryText, marginBottom: '2rem' },
  landingLoginButton: { /* Style remains the same */
    padding: '12px 25px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: theme.accentColor,
    color: 'white',
    fontWeight: 'bold',
    transition: 'background-color 0.2s ease',
    width: '100%',
    '&:hover': { backgroundColor: theme.accentHover },
    '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' }
  },

  // --- Dashboard Layout (Updated) ---
  dashboardLayout: {
    // This container might not need much styling itself now
    minHeight: '100vh', // Still good for overall page structure
    paddingTop: '60px', // <-- ADD THIS: Global padding to account for fixed header
    paddingLeft: '260px', // <-- ADD THIS: Global padding to account for fixed sidebar
    boxSizing: 'border-box' // Ensure padding is included in width/height calculations
  },
  dashboardHeader: {
    height: '60px',
    backgroundColor: theme.primaryBackground,
    position: 'fixed',
    width: '100%',
    zIndex: 1010,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    borderBottom: `1px solid ${theme.borderColor}`,
    color: theme.textOnPrimary,
    // --- NEW Fixed Positioning ---
    position: 'fixed',      // Fix to viewport
    top: 0,                 // Align to top
    left: 0,                // Align to left
    width: '100%',          // Full width
    zIndex: 1010,           // Ensure it's above other fixed/scrolling content
    boxSizing: 'border-box' // Include padding/border in width calculation
  },
  headerLogoContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  headerLogo: { height: '35px', width: 'auto', marginRight: '1rem' },
  headerTitle: { fontSize: '1.4rem', fontWeight: 'bold', margin: 0 },
  logoutButton: { // Style for logout button
    padding: '8px 15px',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '4px',
    border: `1px solid ${theme.accentColor}`, // Border with accent
    backgroundColor: 'transparent', // Transparent background
    color: theme.accentColor, // Text color accent
    transition: 'all 0.2s ease',
    '&:hover': { backgroundColor: theme.accentColor, color: 'white' },
    '&:disabled': { opacity: 0.5, cursor: 'not-allowed' }
  },
  dashboardContentArea: { // Container for sidebar + main
    display: 'flex',
    flexGrow: 1, // Take remaining vertical space
    overflow: 'hidden', // Prevent double scrollbars if needed
  },
  dashboardSidebar: {
    width: '260px',
    backgroundColor: theme.primaryBackground,
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${theme.borderColor}`,
    color: theme.textOnPrimary,
    position: 'fixed',          // Keep fixed
    top: '60px',                // Keep below header
    left: 0,                    // Keep aligned left
    height: 'calc(100vh - 60px)', // Keep calculated height
    zIndex: 1000,               // Below header, above default content
    boxSizing: 'border-box',    // Include padding/border in width calculation
    display: 'flex',
    flexDirection: 'column',
  },
  // sidebarLogo: { /* Removed, logo is in header now */},
  sidebarTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: theme.textOnPrimary,
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: `1px solid ${theme.borderColor}`,
    flexShrink: 0 // Ensure title doesn't shrink
  },
  sidebarList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    flexGrow: 1, // Allow the list to take up available space
    overflowY: 'auto', // <-- ADD THIS: Make ONLY the list scrollable
    marginBottom: '1rem', // Optional: add space between list and button
  },
  topicListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    margin: '2px 0',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    color: theme.textOnPrimary, // Ensure text contrast
    '&:hover': { backgroundColor: theme.sidebarHover },
  },
  topicListItemSelected: { backgroundColor: theme.sidebarSelected, fontWeight: 'bold' },
  topicListItemName: { flexGrow: 1, marginRight: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  topicListItemDue: { marginLeft: '5px', color: theme.accentColor, fontSize: '1.1em' }, // Review Bell
  topicDeleteButton: { /* Style remains the same */
    padding: '3px 6px',
    fontSize: '11px',
    cursor: 'pointer',
    borderRadius: '3px',
    border: 'none',
    backgroundColor: theme.dangerColor,
    color: 'white',
    opacity: 0.7,
    transition: 'opacity 0.2s ease',
    '&:hover': { opacity: 1, backgroundColor: theme.dangerHover },
    marginLeft: '5px',
  },
  sidebarButton: {
    padding: '10px 15px',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '4px',
    border: '1px solid transparent',
    textAlign: 'center',
    backgroundColor: theme.accentColor,
    color: 'white',
    width: '100%',
    transition: 'background-color 0.2s ease',
    flexShrink: 0, // Ensure button doesn't shrink
    '&:hover': { backgroundColor: theme.accentHover },
    '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' }
  },


  // Dashboard Main Area Styles (Updated background)
  dashboardMain: {
    padding: '2rem',
    overflowY: 'auto', // Allow main content scrolling (This remains correct)
    backgroundColor: theme.secondaryBackground,
    color: theme.primaryText,
    width: '100%', 
    height: '100%', // Make it fill the padded dashboardLayout area
    boxSizing: 'border-box', // Include padding in height/width calculation
  },
  mainContentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: `1px solid ${theme.borderColor}` },
  mainContentTitle: { fontSize: '1.6rem', color: theme.primaryText, margin: 0 },
  mainActions: { display: 'flex', gap: '10px' },
  placeholderText: { textAlign: 'center', color: theme.secondaryText, marginTop: '4rem', fontSize: '1.1rem' },
  sectionTitle: { fontSize: '1.3rem', color: theme.primaryText, marginBottom: '1rem', marginTop: '2rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${theme.borderColor}` },
  actionButton: { /* Style remains similar, check contrast if needed */
    padding: '8px 15px',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '4px',
    border: '1px solid transparent',
    transition: 'background-color 0.2s ease',
    backgroundColor: theme.infoColor,
    color: 'white',
    '&:hover': { backgroundColor: theme.infoHover },
    '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' }
  },
  secondaryActionButton: {
    backgroundColor: theme.secondaryText,
    '&:hover': { backgroundColor: theme.primaryText },
  },
  primaryActionButton: {
    backgroundColor: theme.accentColor,
    '&:hover': { backgroundColor: theme.accentHover },
  },

  // Flashcard Styles (Updated Background & Text Color)
  // --- Flashcard Styles (Updated Background & Text Color) ---
  flashcardListContainer: { marginBottom: '1.5rem' },
  flashcardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' },
  flashcardItem: { // Updated background & text
    backgroundColor: theme.primaryBackground, // Use primary beige color
    border: `1px solid ${theme.borderColor}`, // Use standard border color
    color: theme.textOnPrimary, // Use text color suitable for primary background

    // Keep the rest:
    borderRadius: '8px',
    padding: '15px',
    boxShadow: theme.cardShadow,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '150px',
  },
  flashcardContent: { marginBottom: '10px', flexGrow: 1 },
  flashcardLabel: {
    display: 'block',
    fontWeight: 'bold',
    color: theme.textOnPrimary, // Adjust label color too
    fontSize: '12px',
    marginBottom: '3px',
    textTransform: 'uppercase',
    opacity: 0.8
  },
  flashcardText: {
    fontSize: '14px',
    color: theme.textOnPrimary, // Adjust main text color too
    marginBottom: '10px',
    wordWrap: 'break-word'
  },
  flashcardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '10px',
    borderTop: `1px solid ${theme.borderColor}`, // Adjust border color
    paddingTop: '10px'
  },
  cardActionButton: { /* Base button style - no change needed here */
    padding: '4px 8px',
    fontSize: '12px',
    cursor: 'pointer',
    borderRadius: '3px',
    border: '1px solid transparent',
    transition: 'background-color 0.2s ease',
  },
  editCardButton: {
    backgroundColor: theme.accentColor, color: 'white', '&:hover': { backgroundColor: theme.accentHover }
  },
  deleteCardButton: {
    backgroundColor: theme.secondaryText, color: 'white', '&:hover': { backgroundColor: theme.primaryText }
  },
  addCardButtonContainer: { marginTop: '1rem' }, // Container for the "+ Add Flashcard" button

  // Practice Mode Styles (Adjust background/text if needed)
  practiceViewContainer: { padding: '1.5rem', backgroundColor: theme.secondaryBackground, borderRadius: '8px', boxShadow: theme.cardShadow, border: `1px solid ${theme.borderColor}` }, // Stays on main bg
  practiceHeader: { fontSize: '1.4rem', color: theme.primaryText, marginBottom: '1.5rem', textAlign: 'center' },
  practiceCardDisplay: { // Use card color for consistency? Or keep white? Let's try card color.
    backgroundColor: theme.cardComplementary, // Use complementary color
    border: `1px dashed ${theme.borderColor}`, // Keep border
    padding: '30px 20px',
    marginBottom: '1.5rem',
    minHeight: '150px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.5rem',
    textAlign: 'center',
    color: theme.textOnComplementary, // Use text for card bg
    borderRadius: '6px',
  },
  practiceControls: { textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '1rem' },
  practiceButton: { /* Styles remain the same */
    padding: '10px 20px',
    fontSize: '1rem',
    cursor: 'pointer',
    borderRadius: '4px',
    border: '1px solid transparent',
    transition: 'background-color 0.2s ease',
  },
  showAnswerButton: { backgroundColor: theme.infoColor, color: 'white', '&:hover': { backgroundColor: theme.infoHover } },
  correctButton: { backgroundColor: theme.successColor, color: 'white', '&:hover': { backgroundColor: '#218838' } },
  incorrectButton: { backgroundColor: theme.dangerColor, color: 'white', '&:hover': { backgroundColor: theme.dangerHover } },
  exitPracticeButton: { backgroundColor: theme.secondaryText, color: 'white', '&:hover': { backgroundColor: theme.primaryText }, marginLeft: '25px' },
  practiceCompleteMessage: { color: theme.successColor, fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center', fontSize: '1.2rem' },


  // Score History Styles (Adjust background/text if needed)
  scoreHistoryList: { listStyle: 'none', padding: 0, margin: 0, maxHeight: '250px', overflowY: 'auto', border: `1px solid ${theme.borderColor}`, borderRadius: '4px', backgroundColor: theme.secondaryBackground }, // On main bg
  scoreListItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: `1px solid ${theme.borderColor}`, fontSize: '14px', color: theme.secondaryText, '&:last-child': { borderBottom: 'none' } },
  scoreDate: {},
  scoreResult: { fontWeight: 'bold', color: theme.primaryText },

  // Modal Styles (Remain on white background)
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: theme.secondaryBackground, padding: '25px', borderRadius: '8px', minWidth: '350px', maxWidth: '500px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', borderTop: `4px solid ${theme.accentColor}` },
  modalTitle: { marginTop: 0, marginBottom: '1.5rem', borderBottom: `1px solid ${theme.borderColor}`, paddingBottom: '0.8rem', color: theme.primaryText, fontSize: '1.4rem' },
  modalActions: { textAlign: 'right', marginTop: '2rem', paddingTop: '1rem', borderTop: `1px solid ${theme.borderColor}` },
  modalCloseButton: {
    padding: '8px 15px',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '4px',
    border: `1px solid ${theme.borderColor}`,
    backgroundColor: theme.secondaryBackground, // Keep light
    color: theme.secondaryText,
    transition: 'background-color 0.2s ease',
    '&:hover': { backgroundColor: '#eee' },
  },
  // Form Styles within Modals
  formGroup: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px', color: theme.primaryText },
  input: { width: '100%', padding: '10px', border: `1px solid ${theme.borderColor}`, borderRadius: '4px', boxSizing: 'border-box', fontSize: '14px', '&:focus': { borderColor: theme.accentColor, outline: 'none' } },
  textarea: { width: '100%', padding: '10px', border: `1px solid ${theme.borderColor}`, borderRadius: '4px', boxSizing: 'border-box', minHeight: '100px', fontSize: '14px', '&:focus': { borderColor: theme.accentColor, outline: 'none' } },
  formButton: { /* Style remains the same */
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '4px',
    border: '1px solid transparent',
    backgroundColor: theme.accentColor,
    color: 'white',
    fontWeight: 'bold',
    transition: 'background-color 0.2s ease',
    '&:hover': { backgroundColor: theme.accentHover },
    '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' },
    marginRight: '10px',
  },

  // Helper to merge styles
  mergeStyles: (...styleObjects) => Object.assign({}, ...styleObjects),
};


// --- Simple Modal Component (Styling unchanged) ---
const Modal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>{title}</h3>
        {children}
      </div>
    </div>
  );
};


// --- App Component ---
function App() {
  // ... (Keep ALL existing state, effects, and handler functions: useState, useCallback, useEffect, initAuth, updateAuthState, fetchTopics, fetchFlashcards, fetchScoreHistory, login, logout, handleAddTopic, handleDeleteTopic, handleSelectTopic, handleAddCard, openEditCardModal, handleUpdateCard, handleDeleteCard, startPractice, handlePracticeAnswer, recordPracticeScore, updateTopicNextReview, handleSetReminder) ...
  // --- State variables ---
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showEditCardModal, setShowEditCardModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [inPracticeMode, setInPracticeMode] = useState(false);
  const [practiceCards, setPracticeCards] = useState([]);
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [showPracticeAnswer, setShowPracticeAnswer] = useState(false);
  const [practiceCorrectCount, setPracticeCorrectCount] = useState(0);
  const [practiceIncorrectCount, setPracticeIncorrectCount] = useState(0);
  const [practiceCompleteMessage, setPracticeCompleteMessage] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [editCardFront, setEditCardFront] = useState('');
  const [editCardBack, setEditCardBack] = useState('');
  const [reminderDate, setReminderDate] = useState('');

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
      setTopics([]);
      setSelectedTopic(null);
      setFlashcards([]);
      setScoreHistory([]);
      setInPracticeMode(false);
      setPracticeCompleteMessage('');
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // --- Data Fetching ---
  const fetchTopics = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    setIsDataLoading(true);
    try {
      const result = await actor.getMyTopics();
      const formattedTopics = result.map(topic => ({
        ...topic,
        id: Number(topic.id),
        createdAt: Number(topic.createdAt / 1_000_000n),
        nextReview: Number(topic.nextReview / 1_000_000n),
      })).sort((a, b) => a.name.localeCompare(b.name));
      setTopics(formattedTopics);
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
    setFlashcards([]);
    try {
      const result = await actor.getFlashcardsForTopic(BigInt(topicId));
      if (result && result.length > 0 && result[0] !== null) {
        const formattedCards = result[0].map(card => ({
          ...card,
          id: Number(card.id),
          topicId: Number(card.topicId),
          createdAt: Number(card.createdAt / 1_000_000n),
        })).sort((a, b) => a.createdAt - b.createdAt);
        setFlashcards(formattedCards);
      } else if (result && result.length === 1 && result[0] === null) {
        setFlashcards([]);
      } else {
        setSelectedTopic(null);
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
    try {
      const result = await actor.getScoreHistoryForTopic(BigInt(topicId));
      if (result && result.length > 0 && result[0] !== null) {
        const formattedScores = result[0].map(score => ({
          ...score,
          id: Number(score.id),
          topicId: Number(score.topicId),
          timestamp: Number(score.timestamp / 1_000_000n),
          correctCount: Number(score.correctCount),
          incorrectCount: Number(score.incorrectCount),
        })).sort((a, b) => b.timestamp - a.timestamp);
        setScoreHistory(formattedScores);
      } else if (result && result.length === 1 && result[0] === null) {
        setScoreHistory([]);
      } else {
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

  useEffect(() => {
    if (isAuthenticated && actor) {
      fetchTopics();
    }
  }, [isAuthenticated, actor, fetchTopics]);

  useEffect(() => {
    if (selectedTopic && actor) {
      setPracticeCompleteMessage('');
      fetchFlashcards(selectedTopic.id);
      fetchScoreHistory(selectedTopic.id);
      setInPracticeMode(false);
    } else {
      setFlashcards([]);
      setScoreHistory([]);
    }
  }, [selectedTopic, actor, fetchFlashcards, fetchScoreHistory]);

  // --- Auth Handlers ---
  const login = async () => {
    if (!authClient || isAuthLoading) return;
    setIsAuthLoading(true);
    try {
      await authClient.login({
        identityProvider: internetIdentityUrl,
        onSuccess: async () => {
          const authenticated = await authClient.isAuthenticated();
          updateAuthState(authClient, authenticated);
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
  const logout = async () => {
    if (!authClient || isAuthLoading) return;
    setIsAuthLoading(true);
    try {
      await authClient.logout();
      updateAuthState(authClient, false);
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
      const initialReviewNanos = BigInt(Date.now()) * 1_000_000n;
      const result = await actor.createTopic(newTopicName.trim(), initialReviewNanos);
      if (result && result.length > 0 && result[0]) {
        setNewTopicName('');
        setShowAddTopicModal(false);
        fetchTopics();
      } else {
        alert("Failed to create topic.");
      }
    } catch (error) {
      console.error("Create topic error:", error);
      alert("Error creating topic.");
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId, topicName) => {
    if (!actor || !window.confirm(`Delete topic "${topicName}" and all related data?`)) return;
    setIsDataLoading(true);
    try {
      const success = await actor.deleteTopic(BigInt(topicId));
      if (success) {
        if (selectedTopic?.id === topicId) setSelectedTopic(null);
        fetchTopics();
      } else {
        alert("Failed to delete topic.");
      }
    } catch (error) {
      console.error("Delete topic error:", error);
      alert("Error deleting topic.");
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSelectTopic = (topic) => {
    if (inPracticeMode && selectedTopic?.id !== topic.id) {
      if (!window.confirm("Exit current practice session?")) {
        return;
      }
    }
    setSelectedTopic(topic);
    setInPracticeMode(false);
  };

  // --- Flashcard Handlers ---
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!actor || !selectedTopic || !newCardFront.trim() || !newCardBack.trim()) return;
    setIsDataLoading(true);
    try {
      const result = await actor.createFlashcard(BigInt(selectedTopic.id), newCardFront.trim(), newCardBack.trim());
      if (result && result.length > 0 && result[0]) {
        setNewCardFront('');
        setNewCardBack('');
        setShowAddCardModal(false);
        fetchFlashcards(selectedTopic.id);
      } else {
        alert("Failed to create flashcard.");
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
      if (success) {
        setShowEditCardModal(false);
        setEditingCard(null);
        fetchFlashcards(selectedTopic.id);
      } else {
        alert("Failed to update flashcard.");
      }
    } catch (error) {
      console.error("Update card error:", error);
      alert("Error updating flashcard.");
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!actor || !window.confirm(`Delete this flashcard?`)) return;
    setIsDataLoading(true);
    try {
      const success = await actor.deleteFlashcard(BigInt(cardId));
      if (success) {
        fetchFlashcards(selectedTopic.id);
      } else {
        alert("Failed to delete flashcard.");
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
    const currentCorrect = practiceCorrectCount + (correct ? 1 : 0);
    const currentIncorrect = practiceIncorrectCount + (correct ? 0 : 1);
    if (correct) setPracticeCorrectCount(count => count + 1);
    else setPracticeIncorrectCount(count => count + 1);

    if (currentPracticeIndex + 1 < practiceCards.length) {
      setCurrentPracticeIndex(index => index + 1);
      setShowPracticeAnswer(false);
    } else {
      const total = practiceCards.length;
      setPracticeCompleteMessage(`Practice Complete! Score: ${currentCorrect} / ${total}`);
      setInPracticeMode(false);
      recordPracticeScore(currentCorrect, currentIncorrect);
      // Simple SRS Logic Placeholder
      const performanceRatio = total > 0 ? currentCorrect / total : 0;
      const oneDayMillis = 24 * 60 * 60 * 1000;
      let nextReviewDelayMillis = oneDayMillis;
      if (performanceRatio >= 0.9) nextReviewDelayMillis = oneDayMillis * 7;
      else if (performanceRatio >= 0.6) nextReviewDelayMillis = oneDayMillis * 3;
      const nextReviewTime = Date.now() + nextReviewDelayMillis;
      updateTopicNextReview(nextReviewTime);
    }
  };

  const recordPracticeScore = async (finalCorrect, finalIncorrect) => {
    if (!actor || !selectedTopic) return;
    try {
      const result = await actor.recordScore(BigInt(selectedTopic.id), BigInt(finalCorrect), BigInt(finalIncorrect));
      if (result && result.length > 0 && result[0] !== null) {
        fetchScoreHistory(selectedTopic.id);
      } else {
        console.error("Failed to record score.");
      }
    } catch (error) {
      console.error("Record score error:", error);
    }
  };

  const updateTopicNextReview = async (nextReviewTimestampMillis) => {
    if (!actor || !selectedTopic) return;
    const timestampNanos = BigInt(nextReviewTimestampMillis) * 1_000_000n;
    try {
      const success = await actor.setTopicNextReview(BigInt(selectedTopic.id), timestampNanos);
      if (success) {
        fetchTopics();
      } else {
        console.error("Failed to update next review time.");
      }
    } catch (error) {
      console.error("Error setting next review time:", error);
    }
  };

  // --- Reminder Handler ---
  const handleSetReminder = async (e) => {
    e.preventDefault();
    if (!actor || !selectedTopic || !reminderDate) return;
    setIsDataLoading(true);
    try {
      const dateObj = new Date(reminderDate + 'T00:00:00Z');
      const timestampMillis = dateObj.getTime();
      if (isNaN(timestampMillis) || timestampMillis <= Date.now()) {
        alert("Please select a valid future date.");
        setIsDataLoading(false);
        return;
      }
      await updateTopicNextReview(timestampMillis);
      alert("Reminder set successfully!");
      setShowReminderModal(false);
      setReminderDate('');
    } catch (error) {
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
  const currentPracticeCard = inPracticeMode ? practiceCards[currentPracticeIndex] : null;

  return (
    <div style={styles.appWrapper}>
      {isDataLoading && <div style={styles.globalLoadingIndicator}>Loading...</div>}

      {!isAuthenticated ? (
        // --- Landing Page ---
        <div style={styles.landingPageContainer}>
          <div style={styles.landingLeft}>
            <img src={logoImage} alt="App Logo" style={styles.landingLogo} />
            <h1 style={styles.landingHeadline}>Sekai Learn</h1>
            <p style={styles.landingDescription}>
              Master anything. Decentralized flashcards on the Internet Computer. Safe, private, yours.
            </p>
          </div>
          <div style={styles.landingRight}>
            <div style={styles.landingLoginBox}>
              <h2 style={styles.landingLoginTitle}>Choose Identity 🔑</h2>
              <p style={styles.landingLoginSubtitle}>to continue</p>
              <button
                style={styles.landingLoginButton}
                onClick={login}
                disabled={isAuthLoading}
              >
                Login with Internet Identity
              </button>
            </div>
          </div>
        </div>
      ) : (
        // --- Dashboard ---
        <div style={styles.dashboardLayout}>
          {/* --- Header --- */}
          <div style={styles.dashboardHeader}>
            <div style={styles.headerLogoContainer}>
              <img src={logoImage} alt="App Logo" style={styles.headerLogo} />
              <h1 style={styles.headerTitle}>Sekai Learn</h1>
            </div>
            <button style={styles.logoutButton} onClick={logout} disabled={isAuthLoading}>
              Logout ({principal?.toString().substring(0, 5)}...)
            </button>
          </div>

          {/* --- Content Area (Sidebar + Main) --- */}
          <div style={styles.dashboardContentArea}>
            {/* --- Sidebar --- */}
            <div style={styles.dashboardSidebar}>
              <h2 style={styles.sidebarTitle}>Topics</h2>
              <ul style={styles.sidebarList}>
                {topics.length === 0 && <li style={{ ...styles.topicListItem, color: theme.secondaryText, cursor: 'default', fontStyle: 'italic' }}>No topics yet.</li>}
                {topics.map(topic => {
                  const isSelected = selectedTopic?.id === topic.id;
                  const isDue = topic.nextReview <= Date.now();
                  const itemStyle = isSelected
                    ? styles.mergeStyles(styles.topicListItem, styles.topicListItemSelected)
                    : styles.topicListItem;

                  return (
                    <li key={topic.id.toString()} style={itemStyle} onClick={() => handleSelectTopic(topic)} title={topic.name}>
                      <span style={styles.topicListItemName}>
                        {topic.name}
                        {isDue && <span style={styles.topicListItemDue} title="Review Due"> 🔔</span>}
                      </span>
                      <button
                        style={styles.topicDeleteButton}
                        onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id, topic.name); }}
                        disabled={isDataLoading}
                        title={`Delete topic "${topic.name}"`}
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button style={styles.sidebarButton} onClick={() => setShowAddTopicModal(true)} disabled={isDataLoading}>
                + Add Topic
              </button>
            </div>

            {/* --- Main Content --- */}
            <div style={styles.dashboardMain}>
              {!selectedTopic ? (
                <p style={styles.placeholderText}>Select a topic from the sidebar to start learning!</p>
              ) : (
                <div>
                  {/* --- Practice Mode View --- */}
                  {inPracticeMode ? (
                    <div style={styles.practiceViewContainer}>
                      <h2 style={styles.practiceHeader}>Practice: {selectedTopic.name} ({currentPracticeIndex + 1} / {practiceCards.length})</h2>
                      <div style={styles.practiceCardDisplay}>
                        {currentPracticeCard ? (showPracticeAnswer ? currentPracticeCard.back : currentPracticeCard.front) : 'Loading card...'}
                      </div>
                      <div style={styles.practiceControls}>
                        {!showPracticeAnswer ? (
                          <button style={styles.mergeStyles(styles.practiceButton, styles.showAnswerButton)} onClick={() => setShowPracticeAnswer(true)}>Show Answer</button>
                        ) : (
                          <>
                            <button style={styles.mergeStyles(styles.practiceButton, styles.correctButton)} onClick={() => handlePracticeAnswer(true)}>Correct</button>
                            <button style={styles.mergeStyles(styles.practiceButton, styles.incorrectButton)} onClick={() => handlePracticeAnswer(false)}>Incorrect</button>
                          </>
                        )}
                        <button style={styles.mergeStyles(styles.practiceButton, styles.exitPracticeButton)} onClick={() => setInPracticeMode(false)}>Exit Practice</button>
                      </div>
                    </div>
                  ) : (
                    // --- Topic Detail View (Cards & History) ---
                    <>
                      <div style={styles.mainContentHeader}>
                        <h1 style={styles.mainContentTitle} title={`ID: ${selectedTopic.id}`}>{selectedTopic.name}</h1>
                        <div style={styles.mainActions}>
                          {flashcards.length > 0 &&
                            <button style={styles.mergeStyles(styles.actionButton, styles.primaryActionButton)} onClick={startPractice} disabled={isDataLoading}>Start Practice</button>
                          }
                          <button style={styles.mergeStyles(styles.actionButton, styles.secondaryActionButton)} onClick={() => setShowReminderModal(true)} disabled={isDataLoading}>Set Reminder</button>
                        </div>
                      </div>

                      {practiceCompleteMessage && <p style={styles.practiceCompleteMessage}>{practiceCompleteMessage}</p>}

                      {/* --- Flashcard List/Grid --- */}
                      <h2 style={styles.sectionTitle}>Flashcards ({flashcards.length})</h2>
                      {flashcards.length === 0 && <p style={{ fontSize: '14px', color: theme.secondaryText }}>No flashcards in this topic yet. Create one!</p>}

                      <div style={styles.flashcardGrid}>
                        {flashcards.map(card => (
                          <div key={card.id.toString()} style={styles.flashcardItem}>
                            <div style={styles.flashcardContent}>
                              <div>
                                <span style={styles.flashcardLabel}>Front</span>
                                <p style={styles.flashcardText}>{card.front}</p>
                              </div>
                              <div>
                                <span style={styles.flashcardLabel}>Back</span>
                                <p style={styles.flashcardText}>{card.back}</p>
                              </div>
                            </div>
                            <div style={styles.flashcardActions}>
                              <button style={styles.mergeStyles(styles.cardActionButton, styles.editCardButton)} onClick={() => openEditCardModal(card)} disabled={isDataLoading}>Edit</button>
                              <button style={styles.mergeStyles(styles.cardActionButton, styles.deleteCardButton)} onClick={() => handleDeleteCard(card.id)} disabled={isDataLoading}>Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={styles.addCardButtonContainer}>
                        <button style={styles.mergeStyles(styles.actionButton, styles.primaryActionButton)} onClick={() => setShowAddCardModal(true)} disabled={isDataLoading}>
                          + Add Flashcard
                        </button>
                      </div>

                      {/* --- Score History --- */}
                      <h2 style={styles.sectionTitle}>Score History</h2>
                      {scoreHistory.length === 0 && <p style={{ fontSize: '14px', color: theme.secondaryText }}>No practice sessions recorded yet.</p>}
                      <ul style={styles.scoreHistoryList}>
                        {scoreHistory.map(score => (
                          <li key={score.id.toString()} style={styles.scoreListItem}>
                            <span style={styles.scoreDate}>{new Date(score.timestamp).toLocaleString()}</span>
                            <span style={styles.scoreResult}>Score: {score.correctCount} / {score.correctCount + score.incorrectCount}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div> {/* End Main Content */}
          </div> {/* End Content Area */}
        </div> // End Dashboard Layout
      )}


      {/* --- Modals (Keep existing structure & styling) --- */}
      <Modal show={showAddTopicModal} onClose={() => setShowAddTopicModal(false)} title="Add New Topic">
        <form onSubmit={handleAddTopic}>
          <div style={styles.formGroup}>
            <label htmlFor="topicName" style={styles.label}>Topic Name:</label>
            <input type="text" id="topicName" style={styles.input} value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} required disabled={isDataLoading} placeholder="e.g., Japanese Vocabulary" />
          </div>
          <div style={styles.modalActions}>
            <button type="submit" style={styles.formButton} disabled={isDataLoading || !newTopicName.trim()}>Save Topic</button>
            <button type="button" style={styles.modalCloseButton} onClick={() => setShowAddTopicModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal show={showAddCardModal} onClose={() => setShowAddCardModal(false)} title={`Add Card to "${selectedTopic?.name}"`}>
        <form onSubmit={handleAddCard}>
          <div style={styles.formGroup}>
            <label htmlFor="cardFront" style={styles.label}>Front:</label>
            <textarea id="cardFront" style={styles.textarea} value={newCardFront} onChange={(e) => setNewCardFront(e.target.value)} required disabled={isDataLoading} placeholder="e.g., こんにちは"></textarea>
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="cardBack" style={styles.label}>Back:</label>
            <textarea id="cardBack" style={styles.textarea} value={newCardBack} onChange={(e) => setNewCardBack(e.target.value)} required disabled={isDataLoading} placeholder="e.g., Hello"></textarea>
          </div>
          <div style={styles.modalActions}>
            <button type="submit" style={styles.formButton} disabled={isDataLoading || !newCardFront.trim() || !newCardBack.trim()}>Save Card</button>
            <button type="button" style={styles.modalCloseButton} onClick={() => setShowAddCardModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal show={showEditCardModal} onClose={() => { setShowEditCardModal(false); setEditingCard(null); }} title={`Edit Card`}>
        <form onSubmit={handleUpdateCard}>
          <div style={styles.formGroup}>
            <label htmlFor="editCardFront" style={styles.label}>Front:</label>
            <textarea id="editCardFront" style={styles.textarea} value={editCardFront} onChange={(e) => setEditCardFront(e.target.value)} required disabled={isDataLoading}></textarea>
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="editCardBack" style={styles.label}>Back:</label>
            <textarea id="editCardBack" style={styles.textarea} value={editCardBack} onChange={(e) => setEditCardBack(e.target.value)} required disabled={isDataLoading}></textarea>
          </div>
          <div style={styles.modalActions}>
            <button type="submit" style={styles.formButton} disabled={isDataLoading || !editCardFront.trim() || !editCardBack.trim()}>Update Card</button>
            <button type="button" style={styles.modalCloseButton} onClick={() => { setShowEditCardModal(false); setEditingCard(null); }}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal show={showReminderModal} onClose={() => setShowReminderModal(false)} title={`Set Reminder for "${selectedTopic?.name}"`}>
        <form onSubmit={handleSetReminder}>
          <div style={styles.formGroup}>
            <label htmlFor="reminderDate" style={styles.label}>Next Review Date:</label>
            <input type="date" id="reminderDate" style={styles.input} value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} required disabled={isDataLoading} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div style={styles.modalActions}>
            <button type="submit" style={styles.formButton} disabled={isDataLoading || !reminderDate}>Set Reminder</button>
            <button type="button" style={styles.modalCloseButton} onClick={() => setShowReminderModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

export default App;