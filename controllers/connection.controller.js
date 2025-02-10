import { populate } from "dotenv";
import { ConnectionRequest } from "../models/connectionRequest.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";

export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const senderId = req.user._id;

    if (senderId.toString() === userId) {
      res.status(400).json({ message: "You cant send a request to yourself" });
    }

    if (req.user.connections.includes(userId)) {
      res.status(400).json({ message: "You are already connected" });
    }

    const existingRequest = await ConnectionRequest.findById({
      sender: senderId,
      recipient: userId,
      status: "pending",
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "A connection request aleready exists" });
    }

    const newRequest = new ConnectionRequest({
      sender: senderId,
      recipient: userId,
    });
    await newRequest.save();
    res.status(201).json({ message: "Connection request sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId)
      .populate("sender", "name email  profilepicture headline connections")
      .populate("recipient", "name username");

    if (!request) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    if (request.recipient._id.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to accept this request" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Request has already been processed" });
    }

    request.status = "accepted";
    await request.save();

    await User.findByIdAndUpdate(request.sender._id, {
      $addToSet: { connections: userId },
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { connections: requestId },
    });

    const notification = new Notification({
      recipient: request.sender._id,
      relatedUser: userId,
      type: connectionAccepted,
    });
    await notification.save();
    res.status(200).json({ message: "Connection request accepted" });

    const senderEmail = request.sender.email;
    const senderName = request.sender.name;
    const recipientName = request.recipient.name;
    const profileUrl =
      process.env.CLIENT_URL + "/profile/" + request.recipient.name;

    try {
      await sendConnectionAcceptedEmail(
        senderEmail,
        senderName,
        recipientName,
        profileUrl
      );
    } catch (error) {
      console.log("Error in sendConnectionAcceptedEmail:", error);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const rejectConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId);

    if (request.recipient.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to reject this request" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This request has already been processed" });
    }

    request.status = "rejected";
    await request.save();
    res.json({ messsage: "Connection request rejected" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getConnectionRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await ConnectionRequest.find({
      recipient: userId,
      status: "pending",
    }).populate("sender", "name  profilepicture headline connections");

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserConnections = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.find(userId).populate(
      "connections",
      "name profilePicture headline connections"
    );

    res.json(user.connections);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const removeConnection = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    await User.findByIdAndUpdate(myId, { $pull: { connections: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { connections: myId } });
    res.json({ message: "Connection removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getConnectionStatus = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const currentUser = req.user;
    if (currentUser.connections.includes(targetUserId)) {
      return res.json({ status: "connected" });
    }

    const pendingRequest = await ConnectionRequest.findOne({
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId },
      ],
      status: "pending",
    });

    if (pendingRequest) {
      if (pendingRequest.sender.toString() === currentUserId.toString()) {
        return res.json({ status: "pending" });
      } else {
        return res.json({ status: "received", requestId: pendingRequest._id });
      }
    }

    res.json({ status: "not_connected" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
