import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { motion } from "framer-motion";

const ScoreDisplay = ({ scoreData, explanation, isLoading, darkMode }) => {
    // Define colors based on the theme
    const textColor = darkMode ? "#E2E8F0" : "#2D3748"; // Light mode and dark mode text colors
    const pathColor = darkMode ? "#63B3ED" : "#3182CE"; // Adjust circle color for dark mode and light mode

    const renderScoreCircle = (label, score) => (
        <div className="flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24">
                <CircularProgressbar
                    value={score}
                    text={`${score}/100`}
                    styles={buildStyles({
                        textColor: textColor, 
                        pathColor: pathColor, 
                        trailColor: "#E2E8F0",
                    })}
                />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        </div>
    );

    return (
        <div className="p-4">
            {isLoading ? (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md shadow-md">
                    <p className="text-center text-gray-700 dark:text-gray-300">Calculating scores...</p>
                    <motion.div
                        className="w-8 h-8 border-t-2 border-blue-500 rounded-full mx-auto mt-2"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                </div>
            ) : scoreData ? (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md shadow-md">
                    <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Match Scores</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {renderScoreCircle("Relevancy Score", scoreData["Relevancy Score"])}
                        {renderScoreCircle("Profile Score", scoreData["Profile Score"])}
                        {renderScoreCircle("Overall Score", scoreData["Overall Score"])}
                    </div>
                    {explanation && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm text-gray-700 dark:text-gray-300">
                            <p className="font-semibold mb-1 text-gray-900 dark:text-white">Why this score?</p>
                            <p>{explanation}</p>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
};

export default ScoreDisplay;
