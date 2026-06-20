document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropzoneContent = document.getElementById('dropzoneContent');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeImgBtn = document.getElementById('removeImgBtn');
    const actionsBar = document.getElementById('actionsBar');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const resultsPanel = document.getElementById('resultsPanel');
    const resultsList = document.getElementById('resultsList');

    let selectedFile = null;

    // Trigger browse file input
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // Handle drag events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    // Handle dropped file
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Handle file input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Process selected file
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPEG, PNG, WEBP).');
            return;
        }

        selectedFile = file;

        // Show image preview
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            dropzoneContent.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            actionsBar.classList.remove('hidden');
            
            // Auto scroll slightly to show actions bar on mobile
            actionsBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        reader.readAsDataURL(file);

        // Hide results when new image is uploaded
        resultsPanel.classList.add('hidden');
    }

    // Remove image button
    removeImgBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUpload();
    });

    function resetUpload() {
        selectedFile = null;
        fileInput.value = '';
        imagePreview.src = '#';
        previewContainer.classList.add('hidden');
        dropzoneContent.classList.remove('hidden');
        actionsBar.classList.add('hidden');
        resultsPanel.classList.add('hidden');
    }

    // Analyze button click
    analyzeBtn.addEventListener('click', () => {
        if (!selectedFile) return;

        // Set Loading state
        analyzeBtn.disabled = true;
        btnText.textContent = 'Analyzing...';
        btnSpinner.classList.remove('hidden');

        const formData = new FormData();
        formData.append('image', selectedFile);

        fetch('/predict', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Server error occurred') });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displayResults(data.predictions);
            } else {
                throw new Error('Prediction was unsuccessful');
            }
        })
        .catch(error => {
            console.error(error);
            alert(`Analysis failed: ${error.message}`);
        })
        .finally(() => {
            // Restore button state
            analyzeBtn.disabled = false;
            btnText.textContent = 'Analyze Festival';
            btnSpinner.classList.add('hidden');
        });
    });

    // Helper to get matching CSS class based on label
    function getThemeClass(label) {
        switch(label.toLowerCase()) {
            case 'eid':
                return 'eid-theme';
            case 'durga puja':
                return 'puja-theme';
            case 'christmas':
                return 'christmas-theme';
            default:
                return 'other-theme';
        }
    }

    // Display prediction results
    function displayResults(predictions) {
        resultsList.innerHTML = '';
        resultsPanel.classList.remove('hidden');

        // Scroll to results panel
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        predictions.forEach(pred => {
            const themeClass = getThemeClass(pred.label);
            const percentage = (pred.confidence * 100).toFixed(1);
            
            // Create result item elements
            const item = document.createElement('div');
            item.className = 'result-item';

            item.innerHTML = `
                <div class="result-header">
                    <div class="result-label-wrapper">
                        <span class="result-label">${pred.label}</span>
                        <span class="result-badge ${themeClass}">${pred.label === 'Other' ? 'Generic' : 'Festival'}</span>
                    </div>
                    <span class="result-percentage ${themeClass}">${percentage}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar ${themeClass}" id="bar-${pred.label.replace(/\s+/g, '')}"></div>
                </div>
            `;

            resultsList.appendChild(item);

            // Animate progress bar fill width
            setTimeout(() => {
                const bar = document.getElementById(`bar-${pred.label.replace(/\s+/g, '')}`);
                if (bar) {
                    bar.style.width = `${percentage}%`;
                }
            }, 100);
        });
    }
});
