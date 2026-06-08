import cv2
import numpy as np
import pytesseract
import sys

def preprocess_image_for_ocr(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Image not found or unable to load.")

    img = cv2.resize(img, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )
    processed_img = cv2.medianBlur(binary, 3)
    return processed_img

def extract_text_with_custom_config(image):
    custom_config = r'--oem 3 --psm 6'
    text = pytesseract.image_to_string(image, config=custom_config)
    return text

if __name__ == "__main__":
    image_file = sys.argv[1] if len(sys.argv) > 1 else "test_image.jpg"

    try:
        clean_image = preprocess_image_for_ocr(image_file)
        cv2.imwrite("preprocessed_image.jpg", clean_image)
        print("Preprocessed image saved to preprocessed_image.jpg")

        extracted_text = extract_text_with_custom_config(clean_image)

        print("--- Extracted Text ---")
        print(extracted_text)

    except Exception as e:
        print(f"Error: {e}")
