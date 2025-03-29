import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import RBTree "mo:base/RBTree"; // Use RBTree
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Buffer "mo:base/Buffer";

actor Backend {

  // --- Types ---
  public type TopicId = Nat;
  public type CardId = Nat;
  public type ScoreId = Nat;

  public type Topic = {
    id: TopicId;
    owner: Principal;
    name: Text;
    createdAt: Time.Time;
    nextReview: Time.Time;
  };

  public type Flashcard = {
    id: CardId;
    owner: Principal;
    topicId: TopicId;
    front: Text;
    back: Text;
    createdAt: Time.Time;
  };

  public type ScoreRecord = {
    id: ScoreId;
    owner: Principal;
    topicId: TopicId;
    timestamp: Time.Time;
    correctCount: Nat;
    incorrectCount: Nat;
  };

  // --- Storage (Heap Variables) ---
  // These are NOT stable, require pre/post upgrade handling
  var topics = RBTree.RBTree<TopicId, Topic>(Nat.compare);
  var flashcards = RBTree.RBTree<CardId, Flashcard>(Nat.compare);
  var scores = RBTree.RBTree<ScoreId, ScoreRecord>(Nat.compare);

  // --- Stable Variables (for Persistence & Upgrade) ---
  // Simple ID counters
  stable var nextTopicId : TopicId = 0;
  stable var nextCardId : CardId = 0;
  stable var nextScoreId : ScoreId = 0;

  // Stable storage for serialization during upgrades
  // Tuples are stable if their components are stable. Nat, Principal, Text, Time.Time are stable.
  stable var stableTopics : [(TopicId, Topic)] = [];
  stable var stableFlashcards : [(CardId, Flashcard)] = [];
  stable var stableScores : [(ScoreId, ScoreRecord)] = [];

  // --- Upgrade Hooks ---
  system func preupgrade() {
    // Serialize heap variables to stable variables
    stableTopics := Iter.toArray(topics.entries());
    stableFlashcards := Iter.toArray(flashcards.entries());
    stableScores := Iter.toArray(scores.entries());
  };

  system func postupgrade() {
    // Restore heap variables from stable variables
    for ((id, topic) in stableTopics.vals()) {
      topics.put(id, topic); // Re-insert into RBTree
    };
    for ((id, card) in stableFlashcards.vals()) {
      flashcards.put(id, card);
    };
     for ((id, score) in stableScores.vals()) {
      scores.put(id, score);
    };
    // Clear stable arrays after restoring (optional, saves stable storage space)
    stableTopics := [];
    stableFlashcards := [];
    stableScores := [];
  };

  // --- Helper Function ---
  // Simplified check (ensure caller == owner)
  func isOwner(caller: Principal, ownerPrincipal: Principal) : Bool {
    return caller == ownerPrincipal;
  };

  // --- Public Methods ---

  public shared(msg) func whoami() : async Principal {
    // Use 'msg' as defined in the function signature
    return msg.caller;
  };

  // == Topics ==

  // Get topics owned by the caller
  public shared(msg) func getMyTopics() : async [Topic] {
    let caller = msg.caller;
    // Use Buffer instead of array concatenation
    let userTopicsBuffer = Buffer.Buffer<Topic>(10); // Initial capacity 10 (adjust if needed)
    for ((_id, topic) : (TopicId, Topic) in topics.entries()) {
      if (topic.owner == caller) {
         // Add item to buffer
         userTopicsBuffer.add(topic);
      };
    };
    // Convert buffer to immutable array before returning
    return Buffer.toArray(userTopicsBuffer);
  };

  // Create a new topic
  // Returns optional Topic (?Topic). null if creation fails.
  public shared(message) func createTopic(name: Text, initialReviewTime: Time.Time) : async ?Topic {
    let caller = message.caller;
    if (Text.size(name) == 0) { return null; }; // Basic validation

    let newId = nextTopicId;
    let now = Time.now();

    let newTopic : Topic = {
      id = newId;
      owner = caller;
      name = name;
      createdAt = now;
      nextReview = initialReviewTime; // Use provided time
    };

    topics.put(newId, newTopic); // Add to RBTree
    nextTopicId += 1;
    return ?newTopic;
  };

  // Delete a topic and its associated cards and scores
  // Returns Bool. false if topic not found or not owner.
  public shared(message) func deleteTopic(topicId: TopicId) : async Bool {
    let caller = message.caller;
    let topicOpt = topics.get(topicId); // Get topic first

    switch (topicOpt) {
      case (null) { return false; }; // Not found
      case (?topic) {
        // Authorization
        if (not isOwner(caller, topic.owner)) { return false; }; // Not owner

        // --- Delete associated flashcards ---
        // Iterate through all flashcards. If one belongs to this topic/owner, delete it.
        // It's generally safe to modify the RBTree while iterating if using its specific iterators,
        // but for simplicity and robustness, we can collect IDs first *then* delete,
        // or iterate over a *copy* of keys if modification during iteration is problematic.
        // Let's stick to collecting IDs using Buffer first for safety, then deleting.

        let cardsToDeleteBuffer = Buffer.Buffer<CardId>(10);
        for ((cardId, card) : (CardId, Flashcard) in flashcards.entries()) {
           // Check owner as well for extra safety
           if (card.topicId == topicId and card.owner == caller) {
              cardsToDeleteBuffer.add(cardId);
           };
        };
        // Now delete based on the collected IDs
        let cardsToDeleteArray = Buffer.toArray(cardsToDeleteBuffer);
        for (cardId in cardsToDeleteArray.vals()) {
            flashcards.delete(cardId);
        };

        // --- Delete associated scores ---
        // Use the same pattern: collect IDs then delete.
        let scoresToDeleteBuffer = Buffer.Buffer<ScoreId>(10);
        for ((scoreId, score) : (ScoreId, ScoreRecord) in scores.entries()) {
           if (score.topicId == topicId and score.owner == caller) {
              scoresToDeleteBuffer.add(scoreId);
           };
        };
        // Now delete based on the collected IDs
        let scoresToDeleteArray = Buffer.toArray(scoresToDeleteBuffer);
        for (scoreId in scoresToDeleteArray.vals()) {
            scores.delete(scoreId);
        };

        // --- Finally, delete the topic itself ---
        topics.delete(topicId);

        return true; // Success
      };
    };
  };

   // Update when the next review should be
   // Returns Bool. false if topic not found or not owner.
  public shared(message) func setTopicNextReview(topicId: TopicId, nextReviewTime: Time.Time) : async Bool {
    let caller = message.caller;
    switch (topics.get(topicId)) {
      case (null) { return false }; // Not found
      case (?topic) {
         // Authorization
        if (not isOwner(caller, topic.owner)) { return false }; // Not owner

        // Create updated record and put it back (RBTree updates by put)
         let updatedTopic : Topic = {
          id = topic.id;
          owner = topic.owner;
          name = topic.name;
          createdAt = topic.createdAt;
          // Only change the nextReview field
          nextReview = nextReviewTime;
        };
        topics.put(topicId, updatedTopic); // Put the newly constructed record
        return true; // Success
      }
    }
  };


  // == Flashcards ==

  // Get flashcards for a specific topic owned by the caller
  // Returns optional array (?[]). null if topic not found/not owned. Empty array if topic found but no cards.
  public shared(msg) func getFlashcardsForTopic(topicId: TopicId) : async ?[Flashcard] {
      let caller = msg.caller;
      switch(topics.get(topicId)) {
        case(null) { return null };
        case(?topic) {
            if (not isOwner(caller, topic.owner)) { return null };
        };
      };

      // Use Buffer
      let topicCardsBuffer = Buffer.Buffer<Flashcard>(10);
      for ((_id, card) : (CardId, Flashcard) in flashcards.entries()) {
        if (card.topicId == topicId and card.owner == caller) {
          // Add item to buffer
          topicCardsBuffer.add(card);
        };
      };
      // Convert buffer to array and wrap in Option
      return ?Buffer.toArray(topicCardsBuffer);
  };

   // Create a flashcard
   // Returns optional Flashcard (?Flashcard). null if creation fails (validation, topic auth).
  public shared(message) func createFlashcard(topicId: TopicId, front: Text, back: Text) : async ?Flashcard {
    let caller = message.caller;

     // Validate input
    if (Text.size(front) == 0 or Text.size(back) == 0) {
      return null; // Invalid input
    };

    // Check if topic exists and belongs to caller
    switch(topics.get(topicId)) {
      case (null) { return null; }; // Topic doesn't exist
      case (?topic) {
        if (not isOwner(caller, topic.owner)) { return null; }; // Topic not owned by caller

        // Create the card
        let newId = nextCardId;
        let now = Time.now();
        let newCard : Flashcard = {
          id = newId;
          owner = caller;
          topicId = topicId;
          front = front;
          back = back;
          createdAt = now;
        };
        flashcards.put(newId, newCard);
        nextCardId += 1;
        return ?newCard; // Success
      }
    };
  };

   // Update a flashcard
   // Returns Bool. false if card not found or not owner or invalid input.
  public shared(message) func updateFlashcard(cardId: CardId, newFront: Text, newBack: Text) : async Bool {
     let caller = message.caller;

     // Validate input
    if (Text.size(newFront) == 0 or Text.size(newBack) == 0) {
      return false; // Invalid input
    };

    switch (flashcards.get(cardId)) {
      case (null) { return false }; // Not found
      case (?card) {
         // Authorization
        if (not isOwner(caller, card.owner)) { return false }; // Not owner

        // Update and put back
        let updatedCard : Flashcard = {
          id = card.id;
          owner = card.owner;
          topicId = card.topicId;
          // Change front and back fields
          front = newFront;
          back = newBack;
          createdAt = card.createdAt;
        };
        flashcards.put(cardId, updatedCard); // Put the newly constructed record
        return true; // Success
      }
    }
  };

   // Delete a flashcard
   // Returns Bool. false if card not found or not owner.
  public shared(message) func deleteFlashcard(cardId: CardId) : async Bool {
    let caller = message.caller;
    switch (flashcards.get(cardId)) {
      case (null) { return false }; // Not found
      case (?card) {
         // Authorization
        if (not isOwner(caller, card.owner)) { return false }; // Not owner

        flashcards.delete(cardId);
        return true; // Success
      }
    }
  };


  // == Scoring ==

  // Get score history for a specific topic owned by the caller
  // Returns optional array (?[ScoreRecord]). null if topic not found/not owned. Empty array if topic found but no scores.
  public shared(msg) func getScoreHistoryForTopic(topicId: TopicId) : async ?[ScoreRecord] {
     let caller = msg.caller;
      switch(topics.get(topicId)) {
        case(null) { return null };
        case(?topic) {
            if (not isOwner(caller, topic.owner)) { return null };
        };
      };

      // Use Buffer
      let topicScoresBuffer = Buffer.Buffer<ScoreRecord>(10);
      for ((_id, score) : (ScoreId, ScoreRecord) in scores.entries()) {
        if (score.topicId == topicId and score.owner == caller) {
          // Add item to buffer
          topicScoresBuffer.add(score);
        };
      };
      // Convert buffer to array and wrap in Option
      return ?Buffer.toArray(topicScoresBuffer);
  };

  // Record a score after a practice session
  // Returns optional ScoreId (?ScoreId). null if recording fails (e.g., topic not owned).
  public shared(message) func recordScore(topicId: TopicId, correct: Nat, incorrect: Nat) : async ?ScoreId {
    let caller = message.caller;
     // Check if topic exists and belongs to caller
    switch(topics.get(topicId)) {
      case (null) { return null; }; // Topic doesn't exist
      case (?topic) {
        if (not isOwner(caller, topic.owner)) { return null; }; // Topic not owned by caller
        // Proceed
      }
    };

    let newId = nextScoreId;
    let now = Time.now();
    let newScore : ScoreRecord = {
      id = newId;
      owner = caller;
      topicId = topicId;
      timestamp = now;
      correctCount = correct;
      incorrectCount = incorrect;
    };

    scores.put(newId, newScore);
    nextScoreId += 1;
    return ?newId; // Success
  };

};