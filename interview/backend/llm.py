from langchain_core.prompts import PromptTemplate
import json
import pymongo
import sys
from bson import ObjectId
from config import Config
from llm_factory import get_llm


def initialize_llm():
    return get_llm()

def create_prompt_template():
    prompt_template = """
    You are a hiring expert and your task is to create a concise technical summary of the candidate based on the following schema.

    Table schema: {table_schema}
    Schema Description: {schema_description}

    Here are two examples of how to summarize candidate information:

    Example 1:
    Input: {example_1_input}
    Output: {example_1_output}

    Example 2:
    Input: {example_2_input}
    Output: {example_2_output}

    Now, here is the candidate's data:
    {candidate_data}

    Based on this information and the examples provided, create a technical summary highlighting their relevant skills, experience, certifications, and education for the position they are applying for. Make sure to include the total years of experience and format the summary similarly to the examples.

    Return only the technical summary.
    """
    return PromptTemplate(
        template=prompt_template,
        input_variables=[
            "candidate_data", 
            "table_schema", 
            "schema_description",
            "example_1_input",
            "example_1_output",
            "example_2_input",
            "example_2_output"
        ]
    )


def initialize_llm_chain(llm, prompt_template):
    return prompt_template | llm


def make_serializable(data):
    if isinstance(data, dict):
        return {key: make_serializable(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [make_serializable(item) for item in data]
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data

def generate_summary(candidate_data):
    llm = initialize_llm()
    prompt_template = create_prompt_template()
    llmchain = initialize_llm_chain(llm, prompt_template)

    # Convert the candidate data to a JSON-serializable format
    serializable_data = make_serializable(candidate_data)

    response = llmchain.invoke({
        "candidate_data": json.dumps(serializable_data, indent=2),
        "table_schema": json.dumps(Config.TABLE_SCHEMA, indent=2),
        "schema_description": Config.SCHEMA_DESCRIPTION,
        "example_1_input": Config.FEW_SHOT_EXAMPLE_1["input"],
        "example_1_output": Config.FEW_SHOT_EXAMPLE_1["output"],
        "example_2_input": Config.FEW_SHOT_EXAMPLE_2["input"],
        "example_2_output": Config.FEW_SHOT_EXAMPLE_2["output"]
    })

    # Clean up and return the response
    response_text = response.content.replace("Output: ", "")
    return response_text.strip()

# Retrieve the candidate collection from MongoDB
def get_collection():
    client = pymongo.MongoClient(Config.MONGO_URI)
    db = client[Config.DB_NAME]
    return db[Config.COLLECTION_NAME]

# Fetch candidate data by name or any other query field
def get_candidate_data(query):
    collection = get_collection()
    candidate_data = collection.find_one(query)
    return candidate_data

def main():
    """
    Main function to generate a technical summary for a candidate.
    
    Expected inputs:
    1. Command-line argument specifying the query field (e.g., 'name')
    2. Command-line argument specifying the query value (e.g., 'John Doe')
    
    Usage example:
    python script.py name "John Doe"
    """

    if len(sys.argv) != 3:
        print("Usage: python script.py <query_field> <query_value>")
        sys.exit(1)
    query_field = sys.argv[1]
    query_value = sys.argv[2]
    query = {query_field: query_value}
    
    try:
        candidate_data = get_candidate_data(query)
        if not candidate_data:
            print(f"No candidate found with {query_field}: {query_value}")
            sys.exit(1)
        summary = generate_summary(candidate_data)
        print("Candidate Technical Summary:")
        print(summary)
    
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
