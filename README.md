# ICP Flashcard App (Anki-Style)

This project is a decentralized flashcard application built on the Internet Computer (ICP), inspired by Anki. It allows users to create topics, manage flashcards within those topics, practice using spaced repetition principles (simplified), track their scores, and set review reminders.

The application leverages Internet Identity for secure, user-specific data storage. Each user's topics, cards, and scores are stored encrypted on the blockchain, accessible only to them.

## Core Features

1.  **User Authentication:** Secure login/signup via Internet Identity. All user data is tied to their unique Principal ID.
2.  **Topic Management:** Create, view, and delete topics to group related flashcards.
3.  **Flashcard Management:** Add, view, edit, and delete flashcards (with front and back content) within specific topics.
4.  **Practice Mode:** Review flashcards for a selected topic. Mark cards as correct or incorrect.
5.  **Score History:** Track performance for each practice session (correct/incorrect count) per topic.
6.  **Review Reminders:** Set a future date/time for the next review session for a topic. Topics due for review are visually highlighted.

## Technology Stack

*   **Backend:** Motoko (running in an ICP canister smart contract)
    *   Uses `ExperimentalStableTrieMap` for persistent storage across upgrades.
*   **Frontend:** React + Vite (without external UI libraries like Shadcn)
    *   Manual UI component construction using standard HTML elements.
    *   Custom CSS styling to achieve a clean, functional look (inspired by Material 3).
*   **Authentication:** Internet Identity via `@dfinity/auth-client`.
*   **ICP Interaction:** `@dfinity/agent` for frontend-backend communication.
*   **Build/Deployment:** DFINITY SDK (`dfx`).

## Development Setup (Local)

1.  **Prerequisites:** Ensure you have [Node.js](https://nodejs.org/) and the [DFINITY SDK (`dfx`)](https://internetcomputer.org/docs/current/developer-docs/getting-started/install/) installed.
2.  **Clone/Download:** Get the project code.
3.  **Start Local Replica:** In a separate terminal, run: `dfx start --background --clean`
4.  **Install Dependencies:** Navigate to the project root and run: `npm install` (This installs dependencies listed in the existing `package.json` files).
5.  **Deploy Locally:** `dfx deploy`
6.  **Run Frontend Dev Server:** `npm run dev`
7.  Open the frontend URL provided by Vite (usually `http://localhost:5173`) in your browser.

*(Note: No additional dependencies should be installed via npm/npx during development as per project constraints.)*