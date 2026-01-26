import { Router } from 'express';
import { Logger } from '../Logger';
import { FirestoreRestService } from '../services/FirestoreRestService';
import { generateQuizWithGemini } from './quizRoutes';

const router = Router();

// GET /api/topics - List all topics
router.get('/', async (_req, res) => {
    try {
        const fs = new FirestoreRestService();
        const list = await fs.listTopics();
        res.json(list);
    } catch (e) {
        Logger.error('[TopicsList] error', e);
        res.status(500).json({ error: 'FAILED_TO_LIST' });
    }
});

// GET /api/topics/:slug - Get topic meta
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const fs = new FirestoreRestService();
        const topic = await fs.getTopic(slug);
        if (!topic) return res.status(404).json({ error: 'NOT_FOUND' });
        res.json(topic);
    } catch (e) {
        res.status(500).json({ error: 'FETCH_ERROR' });
    }
});

// POST /api/topics/:slug/quiz - Generate/Get Topic Quiz
router.post('/:slug/quiz', async (req, res) => {
    try {
        const { slug } = req.params;
        const fs = new FirestoreRestService();
        const today = new Date().toISOString().split('T')[0];

        // 1. Check if quiz already exists for today
        const existing = await fs.getTopicQuiz(slug, today);
        if (existing) return res.json(existing);

        // 2. Fetch topic metadata to get sources
        const topic = await fs.getTopic(slug);
        if (!topic) return res.status(404).json({ error: 'TOPIC_NOT_FOUND' });

        // 3. Generate quiz
        const generated = await generateQuizWithGemini(topic.title, topic.sources);

        // 4. Save quiz
        const success = await fs.saveTopicQuiz(slug, today, generated);
        if (!success) Logger.error('[QuizSaveFail]', { slug, today });

        res.json({ id: today, date: today, topicSlug: slug, ...generated });
    } catch (e) {
        Logger.error('[TopicQuizGen] error', e);
        res.status(500).json({ error: 'QUIZ_GEN_FAILED' });
    }
});

export default router;
