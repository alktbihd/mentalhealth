const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  questionId: {
    type: Number,
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  answerText: {
    type: String,
    required: true
  },
  answerValue: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  }
});

const AssessmentSchema = new mongoose.Schema({
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  answers: [AnswerSchema],
  timestamp: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: String,
    default: function() {
      // Generate a random ID if no user authentication is implemented
      return Math.random().toString(36).substring(2, 15) + 
             Math.random().toString(36).substring(2, 15);
    }
  }
});

// Method to calculate average score
AssessmentSchema.statics.getAverageScore = async function() {
  const result = await this.aggregate([
    {
      $group: {
        _id: null,
        averageScore: { $avg: "$score" }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].averageScore : null;
};

// Method to get score distribution
AssessmentSchema.statics.getScoreDistribution = async function() {
  return await this.aggregate([
    {
      $facet: {
        excellent: [
          { $match: { score: { $gte: 90 } } },
          { $count: "count" }
        ],
        good: [
          { $match: { score: { $gte: 75, $lt: 90 } } },
          { $count: "count" }
        ],
        moderate: [
          { $match: { score: { $gte: 60, $lt: 75 } } },
          { $count: "count" }
        ],
        fair: [
          { $match: { score: { $gte: 40, $lt: 60 } } },
          { $count: "count" }
        ],
        poor: [
          { $match: { score: { $lt: 40 } } },
          { $count: "count" }
        ]
      }
    },
    {
      $project: {
        excellent: { $ifNull: [{ $arrayElemAt: ["$excellent.count", 0] }, 0] },
        good: { $ifNull: [{ $arrayElemAt: ["$good.count", 0] }, 0] },
        moderate: { $ifNull: [{ $arrayElemAt: ["$moderate.count", 0] }, 0] },
        fair: { $ifNull: [{ $arrayElemAt: ["$fair.count", 0] }, 0] },
        poor: { $ifNull: [{ $arrayElemAt: ["$poor.count", 0] }, 0] }
      }
    }
  ]);
};

// Method to get user's assessment history
AssessmentSchema.statics.getUserHistory = async function(userId) {
  return await this.find({ userId })
    .select('score timestamp')
    .sort({ timestamp: -1 });
};

module.exports = mongoose.model('Assessment', AssessmentSchema);
