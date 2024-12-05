import subprocess
import os
import socket
from flask import Flask, request, jsonify, render_template, send_file, session, redirect, url_for, Response
from dotenv import load_dotenv
import random
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta # For setting session timeout

# Load environment variables from a .env file (if needed)
load_dotenv()

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Required for session management (use a secure key in production)

# Temporary mapping of usernames to emails
USER_EMAIL_MAPPING = {
    "sambauser": "jihadislam.diu@gmail.com",
}

# In-memory storage for OTPs
otp_store = {}

# Generate OTP and send via email
def generate_and_send_otp(username):
    otp = f"{random.randint(100000, 999999)}"  # 6-digit OTP
    email = USER_EMAIL_MAPPING.get(username)
    if not email:
        return False, "Email not found for the user."

    # Save OTP and expiration time in memory
    otp_store[username] = {
        "otp": otp,
        "expires_at": datetime.now() + timedelta(minutes=5)  # 5 minutes validity
    }

    # Send OTP via email
    try:
        # Configure your SMTP server here
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        sender_email = "your-email@example.com"
        sender_password = "your-email-password"

        # Email setup
        msg = MIMEText(f"Your OTP is: {otp}")
        msg["Subject"] = "Your Login OTP"
        msg["From"] = sender_email
        msg["To"] = email

        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, email, msg.as_string())

        return True, "OTP sent successfully."
    except Exception as e:
        print("Error sending email:", e)
        return False, "Failed to send OTP."

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    username = data.get('username')
    user_otp = data.get('otp')

    # Check if OTP exists for the user
    stored_otp_data = otp_store.get(username)
    
    if not stored_otp_data:
        return jsonify({'message': 'No OTP found. Please request a new one.'}), 400
    
    # Check OTP validity
    if (stored_otp_data['otp'] == user_otp and 
        datetime.now() < stored_otp_data['expires_at']):
        # Clear the OTP after successful verification
        del otp_store[username]
        return jsonify({'message': 'OTP verified successfully!'})
    
    return jsonify({'message': 'Invalid or expired OTP.'}), 400

# Dynamically determine the Samba server's IP address
def get_server_ip():
    return socket.gethostbyname(socket.gethostname())

# Shared folder path on your Samba server
SHARED_FOLDER_PATH = "/home/sambauser/shared_folder"  # Update with your actual Samba shared folder path

@app.route('/')
def home():
    if 'username' in session:
        return redirect(url_for('shared_folders'))
    return render_template('login.html')  # Login page for users

# Login functionality
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data['username']
    password = data['password']

    # Get the current IP address of the Samba server
    server_ip = get_server_ip()

    try:
        # Authenticate using smbclient
        command = [
            'smbclient', f"//{server_ip}/shared_folder", '-U', f"{username}%{password}", '-c', 'dir'
        ]
        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode == 0:
            success, message = generate_and_send_otp(username)
            if success:
                session['username'] = username
                return jsonify({'message': 'OTP sent. Please verify.', 'otp_required': True})
            else:
                return jsonify({'message': message}), 500
        else:
            return jsonify({'message': 'Incorrect username or password!'}), 400
    except Exception as e:
        return jsonify({'message': f"Error: {str(e)}"}), 500

def generate_and_send_otp(username):
    # Update your email configuration
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    sender_email = os.getenv('SENDER_EMAIL')
    sender_password = os.getenv('SENDER_PASSWORD')

    # Existing OTP generation logic
    otp = f"{random.randint(100000, 999999)}"
    email = USER_EMAIL_MAPPING.get(username)
    
    if not email:
        return False, "Email not found for the user."

    try:
        msg = MIMEText(f"Your OTP is: {otp}")
        msg["Subject"] = "Your Samba Server Login OTP"
        msg["From"] = sender_email
        msg["To"] = email

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, [email], msg.as_string())

        # Store OTP
        otp_store[username] = {
            "otp": otp,
            "expires_at": datetime.now() + timedelta(minutes=5)
        }

        return True, "OTP sent successfully."
    except Exception as e:
        print(f"Email sending error: {e}")
        return False, f"Failed to send OTP: {str(e)}"


@app.route('/shared_folders')
def shared_folders():
    if 'username' not in session:
        return redirect(url_for('home'))
    
    username = session['username']
    server_ip = get_server_ip()

    try:
        # List files in the shared folder using smbclient
        command = ['/usr/bin/smbclient', f"//{server_ip}/shared_folder", '-U', f'{username}%jihad', '-c', 'dir']
        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode == 0:
            items = []
            for line in result.stdout.splitlines():
                if line.startswith('  ') and not line.strip().startswith(('.', '..')):
                    parts = line.split()
                    name = parts[0]  # File or folder name
                    type_flag = parts[1]  # Type (D for directory, A for file)
                    item_type = 'folder' if type_flag == 'D' else 'file'
                    items.append({'name': name, 'type': item_type})
            return render_template('shared_folders.html', items=items, username=username)
        else:
            return jsonify({'message': 'Failed to list items in the shared folder'}), 400
    except Exception as e:
        return jsonify({'message': f"Error: {str(e)}"}), 500

# Upload file functionality
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    try:
        file_path = os.path.join(SHARED_FOLDER_PATH, file.filename)
        file.save(file_path)
        return jsonify({'message': f'File "{file.filename}" uploaded successfully!'})
    except Exception as e:
        return jsonify({'message': f"Error during upload: {str(e)}"}), 500


# Download file functionality with Content-Length header
@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    try:
        file_path = os.path.join(SHARED_FOLDER_PATH, filename)
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)  # Get file size

            def generate():
                with open(file_path, 'rb') as file:
                    while chunk := file.read(4096):  # Read file in chunks
                        yield chunk

            return Response(
                generate(),
                headers={
                    'Content-Disposition': f'attachment; filename="{filename}"',
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': file_size,  # Include file size in header
                }
            )
        else:
            return jsonify({'message': f'File "{filename}" not found!'}), 404
    except Exception as e:
        return jsonify({'message': f"Error during download: {str(e)}"}), 500



# Search functionality 
@app.route('/search', methods=['GET'])
def search_files():
    if 'username' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    query = request.args.get('query', '').lower().strip()
    print(f"Search query received: {query}")  # Debug log

    try:
        # List all items in the shared folder
        items = os.listdir(SHARED_FOLDER_PATH)
        search_results = []

        for item in items:
            if query in item.lower():  # Check if query is part of the filename
                item_path = os.path.join(SHARED_FOLDER_PATH, item)
                item_type = 'folder' if os.path.isdir(item_path) else 'file'
                search_results.append({'name': item, 'type': item_type})

        print(f"Search results: {search_results}")  # Debug log
        return jsonify({'results': search_results})
    except Exception as e:
        print(f"Error during search: {str(e)}")  # Debug log
        return jsonify({'message': f"Error during search: {str(e)}"}), 500


@app.route('/files', methods=['GET'])
def get_all_files():
    if 'username' not in session:
        return jsonify({'message': 'Unauthorized'}), 401

    try:
        items = os.listdir(SHARED_FOLDER_PATH)  # List all items in the shared folder
        files = []

        for item in items:
            item_path = os.path.join(SHARED_FOLDER_PATH, item)
            item_type = 'folder' if os.path.isdir(item_path) else 'file'
            files.append({'name': item, 'type': item_type})

        return jsonify({'files': files})  # Return the full list of files
    except Exception as e:
        return jsonify({'message': f"Error: {str(e)}"}), 500



# Logout functionality
@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return redirect(url_for('home'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)