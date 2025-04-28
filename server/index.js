const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config();

// Import routes
const assessmentRoutes = require('./routes/assessment');

// Create Express app
const app = express();

// CORS Configuration
const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Continuing without MongoDB connection. Some features will be limited.');
    // Don't exit the process, continue without MongoDB
  });

// API routes
app.use('/api', assessmentRoutes);

// Backend calculation endpoint
app.post('/api/calculate-results', async (req, res) => {
  try {
    const { answers } = req.body;
    
    // Calculate score
    let totalScore = 0;
    let maxPossibleScore = answers.length * 5; // 5 is the max value for each question
    
    answers.forEach(answer => {
      totalScore += answer.answerValue;
    });
    
    // Convert to percentage (0-100)
    const score = Math.round((totalScore / maxPossibleScore) * 100);
    
    // Get score description
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
    
    // Generate recommendations
    const recommendations = [];
    
    // Check sleep quality (question 2)
    if (answers[1] && answers[1].answerValue <= 3) {
      recommendations.push("Improve your sleep habits by maintaining a regular sleep schedule and creating a relaxing bedtime routine.");
    }
    
    // Check physical activity (question 3)
    if (answers[2] && answers[2].answerValue <= 3) {
      recommendations.push("Increase your physical activity. Even 30 minutes of moderate exercise most days can significantly improve mental wellbeing.");
    }
    
    // Check social connections (question 4)
    if (answers[3] && answers[3].answerValue <= 3) {
      recommendations.push("Strengthen your social connections. Reach out to friends or family, or consider joining community groups or activities.");
    }
    
    // Check anxiety (question 5)
    if (answers[4] && answers[4].answerValue <= 2) {
      recommendations.push("Practice stress-reduction techniques such as mindfulness, deep breathing, or meditation to manage anxiety.");
    }
    
    // Check work-life balance (question 6)
    if (answers[5] && answers[5].answerValue <= 3) {
      recommendations.push("Improve your work-life balance by setting boundaries, taking breaks, and making time for activities you enjoy.");
    }
    
    // Add general recommendations if list is short
    if (recommendations.length < 3) {
      recommendations.push("Practice gratitude by regularly noting things you're thankful for.");
      recommendations.push("Limit screen time and social media consumption, especially before bed.");
      recommendations.push("Stay hydrated and maintain a balanced diet rich in fruits, vegetables, and whole grains.");
    }
    
    // Fetch average score from MongoDB
    let averageScore;
    if (mongoose.connection.readyState === 1) { // 1 = connected
      const Assessment = require('./models/Assessment');
      try {
        averageScore = await Assessment.getAverageScore();
        // Round to the nearest integer
        averageScore = Math.round(averageScore || 75);
      } catch (err) {
        console.error('Error fetching average score:', err);
        averageScore = 75; // Default if error occurs
      }
    } else {
      averageScore = 75; // Default average score if MongoDB is not connected
    }
    
    // Return results
    res.json({
      success: true,
      results: {
        score,
        description,
        recommendations,
        averageScore
      }
    });
    
    // Try to save to MongoDB if it's connected
    try {
      if (mongoose.connection.readyState === 1) { // 1 = connected
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
      // Continue without saving to MongoDB
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

// Quote API endpoint
app.get('/api/quote', async (req, res) => {
  try {
    const response = await axios.get(process.env.QUOTE_API_URL);
    
    const quote = {
      text: response.data.content,
      author: response.data.author
    };
    
    res.json({ quote });
  } catch (error) {
    console.error('Error fetching quote:', error);
    
    // Fallback quotes related to mental health
    const fallbackQuotes = [
      { text: "Mental health is not a destination, but a process. It's about how you drive, not where you're going.", author: "Noam Shpancer" },
      { text: "You don't have to be positive all the time. It's perfectly okay to feel sad, angry, annoyed, frustrated, scared, or anxious.", author: "Lori Deschene" },
      { text: "Self-care is how you take your power back.", author: "Lalah Delia" },
      { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
      { text: "You are not alone in this journey. Every step you take is a step towards healing.", author: "Unknown" }
    ];
    
    const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    res.json({ quote: randomQuote });
  }
});

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
