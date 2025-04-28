const express = require('express');
const router = express.Router();
const Assessment = require('../models/Assessment');

// Submit a new assessment
router.post('/submit-assessment', async (req, res) => {
  try {
    const { score, answers, timestamp } = req.body;
    
    // Create new assessment
    const assessment = new Assessment({
      score,
      answers,
      timestamp
    });
    
    // Save to database
    await assessment.save();
    
    res.status(201).json({
      success: true,
      message: 'Assessment submitted successfully',
      assessmentId: assessment._id
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assessment',
      error: error.message
    });
  }
});

// Get average score
router.get('/average-score', async (req, res) => {
  try {
    const averageScore = await Assessment.getAverageScore();
    
    res.json({
      success: true,
      averageScore: averageScore || 0
    });
  } catch (error) {
    console.error('Error getting average score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get average score',
      error: error.message
    });
  }
});

// Get score distribution
router.get('/score-distribution', async (req, res) => {
  try {
    const distribution = await Assessment.getScoreDistribution();
    
    res.json({
      success: true,
      distribution: distribution[0] || {
        excellent: 0,
        good: 0,
        moderate: 0,
        fair: 0,
        poor: 0
      }
    });
  } catch (error) {
    console.error('Error getting score distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get score distribution',
      error: error.message
    });
  }
});

// Get user assessment history (if userId is provided)
router.get('/user-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const history = await Assessment.getUserHistory(userId);
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error getting user history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user history',
      error: error.message
    });
  }
});

// Get latest assessments (for admin purposes)
router.get('/latest', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const latestAssessments = await Assessment.find()
      .select('score timestamp')
      .sort({ timestamp: -1 })
      .limit(limit);
    
    res.json({
      success: true,
      assessments: latestAssessments
    });
  } catch (error) {
    console.error('Error getting latest assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get latest assessments',
      error: error.message
    });
  }
});

module.exports = router;
