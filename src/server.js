import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import cors from 'cors';
dotenv.config();
const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());
app.get("/health", (_, res) => {
    res.status(200).json({ status: "ok" });
});
app.post("/api/logs/batch", async (req, res) => {
    const { events } = req.body;
    if (!Array.isArray(events)) {
        return res.status(400).json({ error: "Invalid payload" });
    }
    try {
        await prisma.auditLog.createMany({
            data: events.map((event) => ({
                attemptId: event.attemptId,
                questionId: event.questionId || null,
                eventType: event.type,
                timestampClient: new Date(event.timestamp),
                metadata: event.metadata,
            })),
        });
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("Failed to store logs:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map