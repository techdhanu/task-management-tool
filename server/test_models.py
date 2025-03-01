import os
import sys
import joblib

def test_models(models_dir):
    print("Testing models in directory:", models_dir)

    # Get all .pkl files in the directory
    model_files = [f for f in os.listdir(models_dir) if f.endswith('.pkl')]

    if not model_files:
        print("No model files found!")
        return

    print(f"Found {len(model_files)} model files.")

    for model_file in model_files:
        model_path = os.path.join(models_dir, model_file)
        print(f"\nTesting model: {model_file}")

        try:
            # Try to load the model
            model = joblib.load(model_path)
            print("  - Model loaded successfully")

            # Check if it has basic model attributes
            if hasattr(model, 'predict'):
                print("  - Model has predict method: ✓")
            else:
                print("  - Model is missing predict method: ✗")

            # Print model type
            print(f"  - Model type: {type(model).__name__}")

            # Check if it's a scikit-learn model
            if hasattr(model, 'get_params'):
                print("  - Scikit-learn model: ✓")
            else:
                print("  - Not a standard scikit-learn model: ✗")

        except Exception as e:
            print(f"  - Error loading model: {str(e)}")

if __name__ == "__main__":
    # Use the provided directory or default to ./ai_models
    models_dir = sys.argv[1] if len(sys.argv) > 1 else "./ai_models"
    test_models(models_dir)