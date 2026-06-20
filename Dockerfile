FROM python:3.10-slim

# Set working directory inside container
WORKDIR /code

# Copy requirements and install Python dependencies
COPY requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy all application files to the container
COPY . .

# Hugging Face Spaces runs as user 1000. Give all permissions to directory.
RUN chmod -R 777 /code

# Command to start the Flask application
CMD ["python", "app.py"]
