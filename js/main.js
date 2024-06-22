function calculatePrice() {
    const form = document.getElementById("uploadForm");
    const formData = new FormData(form);
    const selectedLanguages = Array.from(document.querySelectorAll(".multi-select-option.multi-select-selected")).map((option) => option.dataset.value);
    const priceElement = document.getElementById("priceElement");
    const fileInput = document.getElementById("fileInput");
    const wordElement = document.getElementById("wordElement");
    const word = wordElement ? wordElement.getAttribute("data-word") : "Calculating";
    if (!priceElement) {
        console.error("Price element not found");
        return;
    }
    if (selectedLanguages.length === 0) {
        updatePriceElement(0.0);
        return;
    }
    formData.append("language", selectedLanguages.join(","));
    if (fileInput.files.length === 0) {
        updatePriceElement(0.0);
        return;
    }
    const priceValueElement = document.getElementById("priceValue");
    if (priceValueElement) {
        priceValueElement.textContent = `${word}...`;
    }

    fetch("https://lucky-liger-cadc9d.netlify.app/.netlify/functions/upload", {
        method: "POST",
        body: formData,
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            if (data.error) {
                console.error("Backend Error:", data.error);
                priceElement.textContent = "Price: Error";
            } else {
                const amount = parseFloat(data.amount);
                if (isNaN(amount)) {
                    throw new Error("Invalid amount received");
                }
                updatePriceElement(amount);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            priceElement.textContent = "Price: Error";
        });
}

function updatePriceElement(amount) {
    const priceValueElement = document.getElementById("priceValue");
    if (priceValueElement) {
        priceValueElement.textContent = amount.toFixed(2);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    // Function to ping the endpoints
    function warmUpFunctions() {
        // Warm up upload function
        fetch("https://jovial-treacle-09f7aa.netlify.app/.netlify/functions/upload", {
            mode: "no-cors",
        }).catch((error) => {
            // Silently catch and ignore the error
        });

        // Warm up create-stripe-payment function
        fetch("https://jovial-treacle-09f7aa.netlify.app/.netlify/functions/create-stripe-payment", {
            mode: "no-cors",
        }).catch((error) => {
            // Silently catch and ignore the error
        });

        // Warm up stripe-webhook function
        fetch("https://jovial-treacle-09f7aa.netlify.app/.netlify/functions/stripe-webhook", {
            mode: "no-cors",
        }).catch((error) => {
            // Silently catch and ignore the error
        });
    }

    warmUpFunctions();

    const fileInput = document.getElementById("fileInput");
    const fileLabel = document.querySelector("#file-dragDropBox .fileLabel");
    const contextFileInput = document.getElementById("contextfileInput");
    const contextFileContainer = document.getElementById("contextFileContainer");
    const qualitySelect = window.qualitySelect;
    const turnaroundTimeSelect = window.turnaroundTimeSelect;
    const dropArea = document.querySelector(".file-drag-area");
    const contextDropArea = document.querySelector(".context-drag-area");

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e, inputElement) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length === 1) {
            inputElement.files = files;
            inputElement.dispatchEvent(new Event("change"));
        }
    }

    function handleFileSelect(e, dropArea) {
        const file = e.target.files[0];
        if (!file) return;
        const validExtensions = ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/pdf", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain"];

        if (!validExtensions.includes(file.type)) {
            alert("This is not a supported file format.");
            dropArea.classList.remove("active");
            return;
        }

        const fileNameElement = `<span class="file-name">${file.name}</span>`;
        dropArea.classList.add("active");
        dropArea.querySelectorAll(".fileLabel, .button").forEach((el) => el.classList.add("hidden"));

        let existingFileNameElement = dropArea.querySelector(".file-name");
        if (existingFileNameElement) {
            existingFileNameElement.textContent = file.name;
        } else {
            dropArea.insertAdjacentHTML("beforeend", fileNameElement);
        }
        calculatePrice();
    }

    function setupDropArea(dropArea, inputElement) {
        dropArea.addEventListener("dragover", (event) => {
            preventDefaults(event);
            dropArea.classList.add("active");
        });

        dropArea.addEventListener("dragleave", (event) => {
            preventDefaults(event);
            dropArea.classList.remove("active");
        });

        dropArea.addEventListener("drop", (event) => {
            preventDefaults(event);
            handleDrop(event, inputElement);
        });

        dropArea.addEventListener("click", () => inputElement.click());
    }

    setupDropArea(dropArea, fileInput);
    setupDropArea(contextDropArea, contextFileInput);

    fileInput.addEventListener("change", (e) => handleFileSelect(e, dropArea));
    contextFileInput.addEventListener("change", (e) => handleFileSelect(e, contextDropArea));

    if (qualitySelect) {
        // Update the onChange handler of the SingleSelect instance
        qualitySelect.options.onChange = function(value, text) {
            if (value === "Business specific") {
                if (contextFileContainer) {
                    contextFileContainer.style.display = "block";
                }
            } else {
                if (contextFileContainer) {
                    contextFileContainer.style.display = "none";
                }
                if (contextFileInput) {
                    contextFileInput.value = "";
                }
                if (contextDropArea) {
                    contextDropArea.querySelector(".file-name")?.remove();
                    contextDropArea.querySelectorAll(".fileLabel, .button").forEach((el) => el.classList.remove("hidden"));
                }
            }
            calculatePrice();
        };
    } else {
        console.warn("Quality select object not found");
    }

    if (turnaroundTimeSelect) {
        // Update the onChange handler of the turnaround time SingleSelect instance
        turnaroundTimeSelect.options.onChange = function(value, text) {
            calculatePrice();
        };
    } else {
        console.warn("Turnaround time select object not found");
    }
});

function generateStripePaymentLink(e) {
    e.preventDefault();

    const selectedLanguages = Array.from(document.querySelectorAll(".multi-select-option.multi-select-selected")).map((option) => option.dataset.value);
    const fileInput = document.getElementById("fileInput");
    const qualitySelect = window.qualitySelect;
    const selectedQuality = qualitySelect.selectedValue;
    const contextFileInput = document.getElementById("contextfileInput");
    const redirectUrl = document.getElementById("redirectUrl").value; // Get the redirect URL

    if (selectedLanguages.length === 0) {
        alert("Please select at least one language.");
        return;
    }

    if (fileInput.files.length === 0) {
        alert("Please select a file to upload.");
        return;
    }

    if (selectedQuality.value === "Business specific" && contextFileInput.files.length === 0) {
        alert("Please select a context file.");
        return;
    }

    grecaptcha.ready(function () {
        grecaptcha.execute("6LcbydcpAAAAAHmNRQHo6rWbUQcV5Ub7lTepkOQq", { action: "submit" }).then(function (token) {
            const form = document.getElementById("uploadForm");
            const formData = new FormData(form);
            formData.append("g-recaptcha-response", token);
            formData.append("redirectUrl", redirectUrl); // Append the redirect URL to the form data

            formData.append("language", selectedLanguages.join(","));
            if (fileInput.files.length === 0) {
                updatePriceElement(0.0);
                return;
            }

            const payButtonEl = document.getElementById("payButton");
            payButtonEl && (payButtonEl.style.display = "none");
            const payButtonLoading = document.getElementById("payButtonLoading");
            payButtonLoading && (payButtonLoading.style.display = "block");

            fetch("https://jovial-treacle-09f7aa.netlify.app/.netlify/functions/create-stripe-payment", {
                method: "POST",
                body: formData,
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.error) {
                        console.error("Error generating Stripe payment link:", data.error);
                        alert("An error occurred while generating the payment link. Please try again.");
                    } else {
                        window.location.href = data.paymentLink;
                    }
                })
                .catch((error) => {
                    console.error("Error generating Stripe payment link:", error);
                    alert("An error occurred while generating the payment link. Please try again.");
                })
                .finally(() => {
                    const payButtonEl = document.getElementById("payButton");
                    payButtonEl && (payButtonEl.style.display = "block");
                    const payButtonLoading = document.getElementById("payButtonLoading");
                    payButtonLoading && (payButtonLoading.style.display = "none");
                });
        });
    });
}
