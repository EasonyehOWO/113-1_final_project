// File input handler
document.getElementById('modelFile').addEventListener('change', function(e) {
    const label = document.getElementById('fileLabel');
    if (this.files.length > 0) {
        label.textContent = this.files[0].name;
        label.classList.add('has-file');
    } else {
        label.textContent = 'Click to select a 3D model file (.glb, .gltf, .obj, .fbx, .stl)';
        label.classList.remove('has-file');
    }
});

// Upload form handler
document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    formData.append('action', 'upload');
    
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadLoading = document.getElementById('uploadLoading');
    
    uploadBtn.disabled = true;
    uploadLoading.classList.add('active');
    
    try {
        const response = await fetch('api/upload_action.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Model uploaded successfully!', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showMessage(data.message || 'Upload failed', 'error');
            uploadBtn.disabled = false;
            uploadLoading.classList.remove('active');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
        uploadBtn.disabled = false;
        uploadLoading.classList.remove('active');
    }
});

// Edit model
function editModel(modelId) {
    const editForm = document.getElementById(`edit-form-${modelId}`);
    editForm.classList.add('active');
}

// Cancel edit
function cancelEdit(modelId) {
    const editForm = document.getElementById(`edit-form-${modelId}`);
    editForm.classList.remove('active');
}

// Save model changes
async function saveModel(modelId) {
    const editForm = document.getElementById(`edit-form-${modelId}`);
    const formData = new FormData(editForm);
    formData.append('action', 'update');
    formData.append('model_id', modelId);
    
    try {
        const response = await fetch('api/upload_action.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Model updated successfully!', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showMessage(data.message || 'Update failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Delete model
async function deleteModel(modelId, title) {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
        return;
    }
    
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('model_id', modelId);
    
    try {
        const response = await fetch('api/upload_action.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Model deleted successfully!', 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showMessage(data.message || 'Delete failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

// Show message
function showMessage(text, type) {
    const container = document.getElementById('message-container');
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    container.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 5000);
}
