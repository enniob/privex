# 🚀 PRIVEX P2P Communication System  

⚠️ **This project is currently in active development (BETA).**  
⚠️ **Not ready for production use yet. Expect frequent updates and breaking changes.**  

## 📖 Overview  
This is a **peer-to-peer (P2P) communication system** that enables direct messaging and connectivity between distributed nodes. It consists of:  
- **Frontend:** Built with **Angular**, providing a user-friendly interface for managing peer-to-peer connections.  
- **Backend:** A **Node.js WebSocket server** that handles real-time communication between nodes.  

This system is designed to support **dynamic peer discovery**, **real-time messaging**, and **modular expansion** in the future.  

---

## ✅ **Current Features (Initial Release)**  

### 🎯 **P2P Node Registration & Discovery**  
- Each node can **register itself** and **discover other nodes** in the network.  
- New nodes are automatically **notified to existing peers** upon addition.  

### 🔗 **WebSocket-Based Communication**  
- Uses **WebSockets** for persistent, real-time connections between nodes.  
- Each node **automatically stores peer connections** for direct messaging.  

### 🔄 **Dynamic Peer List Management**  
- Nodes can retrieve an updated list of active peers.  
- Automatic removal of **disconnected peers** to maintain a clean network.  

### 🔔 **Real-Time Notifications**  
- When a new peer is added, all connected nodes are notified.  
- When a node goes offline, other peers are **automatically updated**.  

---

## 🚀 **Upcoming Features (Development Pipeline)**  

### 🔜 **Frontend Enhancements (Angular)**  
- **Live peer list updates** without manual refresh.  
- **Chat interface** for real-time messaging between nodes.  
- **Peer status indicators** (Online/Offline).  

### 🔜 **Backend Improvements (Node.js WebSocket Server)**  
- Implement **encryption** for secure WebSocket communication.  
- Introduce **peer authentication** to verify trusted nodes.  

### 🔜 **Support for File Transfer**  
- Enable **peer-to-peer file sharing** between nodes.  

### 🔜 **Modular Plugin System**  
- Support third-party **plugin-based extensions** for custom functionality.  

### 🔜 **Decentralized Network Resilience**  
- Implement **fallback mechanisms** to re-establish lost connections.  

---

## ⚡ **Installation & Setup**  

### **Prerequisites**
- **Node.js** (v20+ recommended)  
- **NPM or Yarn**  
- **Angular CLI** (for frontend development)  
- **Docker** (optional, for deployment)  

### **1️⃣ Clone the Repository**
```sh
git clone https://github.com/enniob/privex
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

## 🎨 **Frontend Setup (Angular Client)**  

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

### **3️⃣ Discovering Peers**
```json
{
  "type": "discover"
}
```

---

## 🛠️ **Contributing**
🚀 **We welcome contributions!** If you’d like to improve the system, follow these steps:  
1. **Fork the repository**  
2. **Create a new branch** (`feature/new-functionality`)  
3. **Commit your changes** (`git commit -m "Added new feature"`)  
4. **Push and create a Pull Request**  

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
