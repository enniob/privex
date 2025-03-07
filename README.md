# 🚀 PRIVEX P2P Communication System

⚠️ **This project is currently in active development (BETA).**
⚠️ **Not ready for production use yet. Expect frequent updates and breaking changes.**

## 📖 Overview

This is a **peer-to-peer (P2P) communication system** designed for direct messaging and connectivity between distributed nodes. It comprises:

-   **Frontend:** Built with **Angular 19**, providing a modern and user-friendly interface for managing P2P connections and real-time messaging.
-   **Backend:** A **Node.js WebSocket server** that facilitates real-time communication between nodes.

This system aims to support **dynamic peer discovery**, **real-time messaging**, and **modular expansion** in the future.

---

## ✅ **Current Features (Initial Release)**

### 🎯 **P2P Node Registration & Manual Peer Connection**

-   Nodes can **register themselves** within the system.
-   Users must **manually enter the IP and port** of other nodes to establish a connection.
-   New nodes are automatically **announced to existing peers** upon joining.


### 🔗 **WebSocket-Based Communication**

-   Utilizes **WebSockets** for persistent, real-time connections between nodes.
-   Each node **maintains peer connections** for direct messaging.

### 🔔 **Real-Time Notifications**

-   Connected nodes receive notifications when a new peer joins the network.
-   Peers are **automatically updated** when a node goes offline.

### 💬 **Real-Time Chat Interface**

-   Implemented a chat interface for real-time messaging between nodes.
-   Added message bubbles and timestamps for a more modern chat experience.
-   Messages are displayed in a left and right format to differentiate senders.

---

## 🚀 **Upcoming Features (Development Pipeline)**

### 🔜 **Frontend Enhancements (Angular 19)**

-   Improved **live peer list updates** without manual refresh.
-   **Peer status indicators** (Online/Offline).
-   **File transfer** UI.

### 🔜 **Backend Improvements (Node.js WebSocket Server)**

-   Implement **end-to-end encryption** for secure WebSocket communication.
-   Introduce **peer authentication** to verify trusted nodes.
-   Implement **message persistence** for offline message delivery.

### 🔜 **Support for File Transfer**

-   Enable **peer-to-peer file sharing** between nodes.

### 🔜 **Modular Plugin System**

-   Support third-party **plugin-based extensions** for custom functionality.

### 🔜 **Decentralized Network Resilience**

-   Implement **fallback mechanisms** to re-establish lost connections.

---

## ⚡ **Installation & Setup**

### **Prerequisites**

-   **Node.js** (v20+ recommended)
-   **NPM or Yarn**
-   **Angular CLI** (for frontend development)
-   **Docker** (optional, for deployment)

### **1️⃣ Clone the Repository**

```sh
git clone [https://github.com/enniob/privex](https://github.com/enniob/privex)
cd privex
```

---

## ⚙️ **Backend Setup (WebSocket Server - Node.js)**

### **2️⃣ Install Dependencies**

```sh
cd backend
npm install
```

### **3️⃣ Start the WebSocket Server**

```sh
npm start
```

By default, the WebSocket server runs on **port 4300**.

### **4️⃣ Start Multiple Nodes (Testing)**

To simulate multiple nodes, run the server on different ports:

```sh
PORT=4301 npm start
PORT=4302 npm start
```

---

## 🎨 **Frontend Setup (Angular 19 Client)**

### **1️⃣ Navigate to the `frontend` Directory**

```sh
cd frontend
```

### **2️⃣ Install Dependencies**

```sh
npm install
```

### **3️⃣ Start the Angular Development Server**

```sh
ng serve
```

By default, the frontend runs on **http://localhost:4200/**.

---

## 📌 **Usage Guide**

### **1️⃣ Registering a Node**

Send a **register request** to the WebSocket server:

```json
{
    "type": "register",
    "callSign": "NodeA",
    "ip": "192.168.1.10",
    "port": "4300"
}
```

### **2️⃣ Adding a Peer**

To add another node (peer):

```json
{
    "type": "addUser",
    "callSign": "NodeB",
    "ip": "192.168.1.20",
    "port": "4301",
    "senderCallSign": "NodeA",
    "senderIp": "192.168.1.10",
    "senderPort": "4300"
}
```


### **4️⃣ Sending Messages**

Use the chat interface to send messages to selected peers.

---

## 🛠️ **Contributing**

🚀 **We welcome contributions!** If you’d like to improve the system, follow these steps:

1.  **Fork the repository**
2.  **Create a new branch** (`feature/new-functionality`)
3.  **Commit your changes** (`git commit -m "Added new feature"`)
4.  **Push and create a Pull Request**

---

## ⚠️ **Disclaimer**

This project is currently in **BETA and actively under development**.
🚧 **Not stable for production use yet.** Expect frequent changes, feature updates, and bug fixes.

---

## 📜 **License**

📝 This project is licensed under the **MIT License**.
See `LICENSE` for details.

---

## 📬 **Contact & Support**

For questions, issues, or feedback, reach out via:

🐙 GitHub Issues: **[Report an Issue](https://github.com/enniob/privex/issues)**
