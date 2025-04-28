const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const assessmentRoutes = require('./routes/assessment');

const app = express();

const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(express.static(path.join(__dirname, '../public')));

mongoose.connect('mongodb+srv://mental112233:mental112233@cluster0.c5jrgbw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Continuing without MongoDB connection. Some features will be limited.');
  });

app.use('/api', assessmentRoutes);

app.post('/api/calculate-results', async (req, res) => {
  try {
    const { answers } = req.body;
    
    let totalScore = 0;
    let maxPossibleScore = answers.length * 5;
    
    answers.forEach(answer => {
      totalScore += answer.answerValue;
    });
    
    const score = Math.round((totalScore / maxPossibleScore) * 100);
    
    let description;
    if (score >= 90) {
      description = "Excellent mental wellbeing. You appear to have strong coping mechanisms and healthy lifestyle habits.";
    } else if (score >= 75) {
      description = "Good mental wellbeing. You have many positive habits, though there may be areas for improvement.";
    } else if (score >= 60) {
      description = "Moderate mental wellbeing. Consider addressing specific areas that may be affecting your mental health.";
    } else if (score >= 40) {
      description = "Your mental wellbeing could benefit from attention. Consider speaking with a mental health professional.";
    } else {
      description = "Your responses suggest you may be experiencing significant mental health challenges. We strongly recommend consulting with a healthcare professional.";
    }
    
    const recommendations = [];
    
    if (answers[1] && answers[1].answerValue <= 3) {
      recommendations.push("Improve your sleep habits by maintaining a regular sleep schedule and creating a relaxing bedtime routine.");
    }
    
    if (answers[2] && answers[2].answerValue <= 3) {
      recommendations.push("Increase your physical activity. Even 30 minutes of moderate exercise most days can significantly improve mental wellbeing.");
    }
    
    if (answers[3] && answers[3].answerValue <= 3) {
      recommendations.push("Strengthen your social connections. Reach out to friends or family, or consider joining community groups or activities.");
    }
    
    if (answers[4] && answers[4].answerValue <= 2) {
      recommendations.push("Practice stress-reduction techniques such as mindfulness, deep breathing, or meditation to manage anxiety.");
    }
    
    if (answers[5] && answers[5].answerValue <= 3) {
      recommendations.push("Improve your work-life balance by setting boundaries, taking breaks, and making time for activities you enjoy.");
    }
    
    if (recommendations.length < 3) {
      recommendations.push("Practice gratitude by regularly noting things you're thankful for.");
      recommendations.push("Limit screen time and social media consumption, especially before bed.");
      recommendations.push("Stay hydrated and maintain a balanced diet rich in fruits, vegetables, and whole grains.");
    }
    
    let averageScore;
    if (mongoose.connection.readyState === 1) {
      const Assessment = require('./models/Assessment');
      try {
        averageScore = await Assessment.getAverageScore();
        averageScore = Math.round(averageScore || 75);
      } catch (err) {
        console.error('Error fetching average score:', err);
        averageScore = 75;
      }
    } else {
      averageScore = 75;
    }
    
    res.json({
      success: true,
      results: {
        score,
        description,
        recommendations,
        averageScore
      }
    });
    
    try {
      if (mongoose.connection.readyState === 1) {
        const Assessment = require('./models/Assessment');
        const assessment = new Assessment({
          score,
          answers: answers.map(a => ({
            questionId: a.questionId,
            questionText: a.questionText,
            answerText: a.answerText,
            answerValue: a.answerValue
          }))
        });
        assessment.save().catch(err => console.error('Error saving to MongoDB:', err));
      }
    } catch (err) {
      console.error('Error trying to save to MongoDB:', err);
    }
    
  } catch (error) {
    console.error('Error calculating results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate results',
      error: error.message
    });
  }
});

app.get('/api/quote', async (req, res) => {
  try {
    const response = await axios.get(process.env.QUOTE_API_URL);
    
    const quote = {
      text: response.data.content,
      author: response.data.author
    };
    
    res.json({
      success: true,
      quote
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    
    const fallbackQuotes = [
      { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
      { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
      { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
      { text: "If life were predictable it would cease to be life, and be without flavor.", author: "Eleanor Roosevelt" }
    ];
    
    const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    
    res.json({
      success: true,
      quote: randomQuote,
      source: "fallback"
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
