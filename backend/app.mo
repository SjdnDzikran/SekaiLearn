import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
// Error type is no longer needed for basic Option/Bool handling
// Result type is no longer needed for basic Option/Bool handling
// Using ExperimentalStableTrieMap for persistence across upgrades.
// Ensure dfx.json has "--enhanced-orthogonal-persistence" argument for the backend canister.
import RBTree "mo:base/RBTree";
import Iter "mo:base/Iter";

actor Backend {

  // --- Types ---

  // Using Nat for IDs for simplicity
  public type TopicId = Nat;
  public type CardId = Nat;
  public type ScoreId = Nat;

  // Main data structures
  public type Topic = {
    id: TopicId;
    owner: Principal;
    name: Text;
    createdAt: Time.Time; // Nanoseconds since epoch
    nextReview: Time.Time; // Nanoseconds since epoch
  };

  public type Flashcard = {
    id: CardId;
    owner: Principal;
    topicId: TopicId;
    front: Text;
    back: Text;
    createdAt: Time.Time; // Nanoseconds since epoch
  };

  // Simple score record for a review session
  public type ScoreRecord = {
    id: ScoreId;
    owner: Principal;
    topicId: TopicId;
    timestamp: Time.Time; // Nanoseconds since epoch
    correctCount: Nat;
    incorrectCount: Nat;
  };

  // --- AppError Type Removed ---


  // --- Storage ---
  // Keys are IDs, Values are the data records.
// --- Storage ---
// Keys are IDs, Values are the data records.
  var topics = RBTree.RBTree<TopicId, Topic>(Nat.compare);
  var flashcards = RBTree.RBTree<CardId, Flashcard>(Nat.compare);
  var scores = RBTree.RBTree<ScoreId, ScoreRecord>(Nat.compare);

  // Simple ID counters
  stable var nextTopicId : TopicId = 0;
  stable var nextCardId : CardId = 0;
  stable var nextScoreId : ScoreId = 0;

  // Stable storage for serialization during upgrades
  stable var topicsEntries : [(TopicId, Topic)] = [];

  system func preupgrade() {
    // Convert to stable format before upgrade
    topicsEntries := Iter.toArray(topics.entries());
  };

  system func postupgrade() {
    // Restore from stable format after upgrade
    for ((id, topic) in topicsEntries.vals()) {
      topics.put(id, topic);
    };
    topicsEntries := [];
  };

  // --- Helper Functions ---

  // Checks if the caller is the owner of a resource (internal use)
  // Keep this as it's useful for internal checks
  func isOwner(caller: Principal, ownerPrincipal: Principal) : Bool {
  return caller == ownerPrincipal;
  };

  // --- authorize helper removed ---


  // --- Public Methods ---

  // Keep the original whoami for debugging/info
  public shared(msg) func whoami() : async Principal {
  return msg.caller;
  };

  // Placeholder for future methods - keeps the actor valid
  // Return types changed:
  // - Option type `?Type` for functions returning data (null means error/not found)
  // - `Bool` for functions performing actions (false means error/unauthorized/not found)

  public query func getMyTopics() : async [Topic] { return [] }; // Returns array, empty if none
  // Returns optional Topic (?Topic). null if creation fails.
  public shared(message) func createTopic(name: Text, initialReviewTime: Time.Time) : async ?Topic { return null };  // Returns Bool. false if topic not found or not owner.
  public shared(message) func deleteTopic(topicId: TopicId) : async Bool { return false };

  // Returns optional array (?[]). null if topic not found/not owned or no cards. Use Option for clarity on "topic found but no cards" vs "topic not found".
  public query func getFlashcardsForTopic(topicId: TopicId) : async ?[Flashcard] { return null };
   // Returns optional Flashcard (?Flashcard). null if creation fails.
  public shared(message) func createFlashcard(topicId: TopicId, front: Text, back: Text) : async ?Flashcard { return null };
   // Returns Bool. false if card not found or not owner.
  public shared(message) func updateFlashcard(cardId: CardId, newFront: Text, newBack: Text) : async Bool { return false };
   // Returns Bool. false if card not found or not owner.
  public shared(message) func deleteFlashcard(cardId: CardId) : async Bool { return false };

  // Returns optional array (?[ScoreRecord]). null if topic not found/not owned or no scores.
  public query func getScoreHistoryForTopic(topicId: TopicId) : async ?[ScoreRecord] { return null };
  // Returns optional ScoreId (?ScoreId). null if recording fails (e.g., topic not owned).
  public shared(message) func recordScore(topicId: TopicId, correct: Nat, incorrect: Nat) : async ?ScoreId { return null };
  // Returns Bool. false if topic not found or not owner.
  public shared(message) func setTopicNextReview(topicId: TopicId, nextReviewTime: Time.Time) : async Bool { return false };

};