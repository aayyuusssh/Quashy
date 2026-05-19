import { Question } from "../models/question.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createQuestion = asyncHandler(async (req, res) => {
    const creatorId = req.user?._id;
    const { questionText, options, correctAnswer, duration, difficulty, category, explanation } = req.body;

    if (!questionText || questionText.trim() === "") {
        throw new ApiError(400, "Question prompt text is required");
    }

    if (!correctAnswer || correctAnswer.trim() === "") {
        throw new ApiError(400, "You must supply the correct optionId identifier");
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
        throw new ApiError(400, "A question must contain a valid array of at least 2 options");
    }

        
    const isOptionsArrayInvalid = options.some(opt => !opt.optionId || !opt.text || opt.text.trim() === "");
    if (isOptionsArrayInvalid) {
        throw new ApiError(400, "Every option entry must have a valid optionId and text string");
    }


    const isValidAnswerId = options.some(opt => opt.optionId === correctAnswer.trim());
    if (!isValidAnswerId) {
        throw new ApiError(400, `The correctAnswer '${correctAnswer}' does not match any valid optionId in your options list.`);
    }


    const question = await Question.create({
        questionText: questionText.trim(),
        options,
        correctAnswer: correctAnswer.trim(),
        duration: duration || 30, 
        difficulty: difficulty || "easy",
        category: category ? category.trim() : undefined, 
        explanation: explanation ? explanation.trim() : "",
        createdBy: creatorId
    });

    return res
        .status(201)
        .json(new ApiResponse(201, question, "Single question seeded successfully"));
});


const bulkUploadQuestions = asyncHandler(async (req, res) => {
    const creatorId = req.user?._id;
    const { questions } = req.body; 

        const sanitizedQuestionsPayload = questions.map((q) => {
        if (!q.questionText || !q.options || !q.correctAnswer) {
            throw new ApiError(400, "Bulk payload rejected: One or more questions are missing core fields");
        }


        const isValidAnswerId = q.options.some(opt => opt.optionId === q.correctAnswer.trim());
        if (!isValidAnswerId) {
            throw new ApiError(400, `Bulk payload error: Answer key '${q.correctAnswer}' is invalid for question: '${q.questionText}'`);
        }

        return {
            ...q,
            questionText: q.questionText.trim(),
            correctAnswer: q.correctAnswer.trim(),
            category: q.category ? q.category.trim() : undefined,
            createdBy: creatorId
        };
    });


    const insertedQuestions = await Question.insertMany(sanitizedQuestionsPayload);

    return res
        .status(201)
        .json(
            new ApiResponse(
                201, 
                { count: insertedQuestions.length, data: insertedQuestions }, 
                "Bulk questions dataset seeded successfully"
            )
        );
});

const getAllQuestions = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    //  If passed, show only questions created by the logged-in user
    const filter = {};
    if (req.query.myQuestions === "true") {
        filter.createdBy = req.user?._id;
    }

    const totalQuestions = await Question.countDocuments(filter);
    const questions = await Question.find(filter)
        .populate("createdBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return res.status(200).json(
        new ApiResponse(200, {
            questions,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalQuestions / limit),
                totalQuestions
            }
        }, "Questions fetched successfully")
    );
});

const getRandomQuestionsForGame = asyncHandler(async (req, res) => {
   
    const limit = parseInt(req.query.limit, 10) || 10; 
    const { category, difficulty } = req.query;

    
    const matchStage = {};
    if (category) matchStage.category = category.trim().toLowerCase();
    if (difficulty) matchStage.difficulty = difficulty.trim().toLowerCase();

   
    const randomQuestions = await Question.aggregate([
        { $match: matchStage },
        { $sample: { size: limit } } 
    ]);

    if (randomQuestions.length === 0) {
        throw new ApiError(404, "No questions found matching the selected criteria");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, randomQuestions, "Random game questions selected successfully"));
});




export {
    createQuestion,
    bulkUploadQuestions,
    getAllQuestions,
    getRandomQuestionsForGame,
}