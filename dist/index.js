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
    if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: "Invalid payload" });
    }
    const attemptId = events[0].attemptId;
    try {
        // Ensure attempt exists (create if first time)
        await prisma.attempt.upsert({
            where: { id: attemptId },
            update: {},
            create: { id: attemptId },
        });
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
app.post("/api/attempt/submit", async (req, res) => {
    const { attemptId } = req.body;
    if (!attemptId) {
        return res.status(400).json({ error: "Missing attemptId" });
    }
    try {
        const attempt = await prisma.attempt.update({
            where: { id: attemptId },
            data: { submittedAt: new Date() },
        });
        return res.json({
            message: "Assessment submitted successfully.",
            attemptId: attempt.id,
            submittedAt: attempt.submittedAt,
        });
    }
    catch (error) {
        return res.status(404).json({
            error: "Attempt not found",
        });
    }
});
app.get("/api/employer/audit/:attemptId", async (req, res) => {
    const { attemptId } = req.params;
    try {
        const attempt = await prisma.attempt.findUnique({
            where: { id: attemptId },
            include: {
                logs: {
                    orderBy: { timestampClient: "asc" },
                },
            },
        });
        if (!attempt) {
            return res.status(404).json({ error: "Attempt not found" });
        }
        return res.json({
            attemptId: attempt.id,
            submittedAt: attempt.submittedAt,
            totalEvents: attempt.logs.length,
            events: attempt.logs.map((log) => ({
                eventType: log.eventType,
                timestampClient: log.timestampClient,
                serverTimestamp: log.createdAt,
                metadata: log.metadata,
            })),
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map