
let cart = JSON.parse(localStorage.getItem("feelingHappyCart")) || [];

const API_URL = "https://feeling-happy-api.onrender.com";

let deliveryQuote = null;

function saveCart() {
    localStorage.setItem("feelingHappyCart", JSON.stringify(cart));
}

function getSubtotal() {
    return cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
}

function updateCartCount() {
    const countElement = document.getElementById("cart-count");

    if (countElement) {
        const count = cart.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        countElement.textContent = count;
    }
}

function updateTotals() {
    const subtotal = getSubtotal();

    const subtotalElement = document.getElementById("cart-subtotal");
    const deliveryElement = document.getElementById("cart-delivery");
    const totalElement = document.getElementById("cart-total");

    if (!subtotalElement || !deliveryElement || !totalElement) {
        return;
    }

    subtotalElement.textContent = `${subtotal} ₴`;

    let delivery = 0;

    if (subtotal === 0) {
        deliveryElement.textContent = "—";
    } else if (subtotal < 200) {
        deliveryElement.textContent = "Мінімальне замовлення — 200 ₴";
    } else if (
        deliveryQuote &&
        deliveryQuote.subtotal === subtotal
    ) {
        delivery = deliveryQuote.deliveryFee;

        deliveryElement.textContent =
            delivery === 0 ? "Безкоштовно" : `${delivery} ₴`;
    } else {
        deliveryElement.textContent = "Розрахуйте доставку";
    }

    totalElement.textContent = `${subtotal + delivery} ₴`;
}

function resetDelivery() {
    deliveryQuote = null;

    const distance = document.getElementById("delivery-distance");
    const category = document.getElementById("delivery-category");
    const message = document.getElementById("delivery-message");

    if (distance) {
        distance.textContent = "Ще не розрахована";
    }

    if (category) {
        category.textContent = "—";
    }

    if (message) {
        message.textContent = "";
    }

    updateTotals();
}

function renderCart() {
    const container = document.getElementById("cart-items");

    if (!container) return;

    container.innerHTML = "";

    if (cart.length === 0) {
        container.innerHTML = "<p>Ваш кошик поки порожній.</p>";
        resetDelivery();
        return;
    }

    cart.forEach((item, index) => {
        const article = document.createElement("article");
        article.className = "cart-item";

        const name = document.createElement("h3");
        name.textContent = item.name;

        const price = document.createElement("p");
        price.textContent = `${item.price} ₴ за шт.`;

        const controls = document.createElement("div");
        controls.className = "cart-controls";

        const minus = document.createElement("button");
        minus.textContent = "−";
        minus.dataset.action = "minus";
        minus.dataset.index = index;

        const quantity = document.createElement("span");
        quantity.textContent = item.quantity;

        const plus = document.createElement("button");
        plus.textContent = "+";
        plus.dataset.action = "plus";
        plus.dataset.index = index;

        const remove = document.createElement("button");
        remove.textContent = "Видалити";
        remove.dataset.action = "remove";
        remove.dataset.index = index;

        controls.append(minus, quantity, plus, remove);

        article.append(name, price, controls);

        container.appendChild(article);
    });

    updateTotals();
}

// Додавання товарів
document.querySelectorAll(".add-to-cart").forEach(button => {
    button.addEventListener("click", () => {
        const name = button.dataset.name;
        const price = Number(button.dataset.price);

        if (!name || !Number.isFinite(price) || price <= 0) {
            return;
        }

        const existingItem = cart.find(
            item => item.name === name
        );

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                name,
                price,
                quantity: 1
            });
        }

        saveCart();
        updateCartCount();
        resetDelivery();

        button.textContent = "Додано ✓";

        setTimeout(() => {
            button.textContent = "Додати в кошик";
        }, 1200);
    });
});

// Керування кошиком
document.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const index = Number(button.dataset.index);
    const action = button.dataset.action;

    if (!cart[index]) return;

    if (action === "plus") {
        cart[index].quantity++;
    }

    if (action === "minus") {
        cart[index].quantity--;

        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
    }

    if (action === "remove") {
        cart.splice(index, 1);
    }

    saveCart();
    updateCartCount();
    resetDelivery();
    renderCart();
});

// Розрахунок доставки
const calculateButton = document.getElementById("calculate-delivery");

if (calculateButton) {
    calculateButton.addEventListener("click", async () => {
        const addressInput = document.getElementById("delivery-address");
        const message = document.getElementById("delivery-message");
        const distanceElement = document.getElementById("delivery-distance");
        const categoryElement = document.getElementById("delivery-category");

        const address = addressInput.value.trim();
        const subtotal = getSubtotal();

        if (subtotal < 200) {
            message.textContent = "Мінімальне замовлення — 200 ₴.";
            return;
        }

        if (address.length < 5) {
            message.textContent = "Введіть повну адресу доставки.";
            addressInput.focus();
            return;
        }

        calculateButton.disabled = true;
        calculateButton.textContent = "Розраховуємо...";
        message.textContent = "Перевіряємо адресу та маршрут...";

        deliveryQuote = null;
        updateTotals();

        try {
            const response = await fetch(
                `${API_URL}/api/delivery/quote`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        address,
                        subtotal
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                if (result.distanceKm !== undefined) {
                    distanceElement.textContent =
                        `${result.distanceKm} км`;
                }

                throw new Error(
                    result.error || "Помилка розрахунку"
                );
            }

            deliveryQuote = {
                subtotal,
                deliveryFee: result.deliveryFee
            };

            distanceElement.textContent =
                `${result.distanceKm} км`;

            categoryElement.textContent =
                result.deliveryFee === 0
                    ? "Безкоштовна доставка"
                    : `${result.deliveryFee} ₴`;

            message.textContent =
                "Вартість доставки успішно розрахована.";

            updateTotals();

        } catch (error) {
            deliveryQuote = null;
            categoryElement.textContent = "—";
            message.textContent = error.message;
            updateTotals();

        } finally {
            calculateButton.disabled = false;
            calculateButton.textContent = "Розрахувати доставку";
        }
    });
}

// Оформлення замовлення
const orderButton = document.getElementById("place-order");

if (orderButton) {
    orderButton.addEventListener("click", async () => {
        const nameInput = document.getElementById("customer-name");
        const phoneInput = document.getElementById("customer-phone");
        const addressInput = document.getElementById("delivery-address");
        const commentInput = document.getElementById("order-comment");
        const message = document.getElementById("order-message");

        const customerName = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const address = addressInput.value.trim();
        const comment = commentInput.value.trim();

        const subtotal = getSubtotal();

        if (cart.length === 0) {
            message.textContent = "Ваш кошик порожній.";
            return;
        }

        if (customerName.length < 2) {
            message.textContent = "Введіть ваше ім'я.";
            nameInput.focus();
            return;
        }

        if (phone.length < 7) {
            message.textContent = "Введіть правильний номер телефону.";
            phoneInput.focus();
            return;
        }

        if (address.length < 5) {
            message.textContent = "Введіть адресу доставки.";
            addressInput.focus();
            return;
        }

        if (subtotal < 200) {
            message.textContent = "Мінімальне замовлення — 200 ₴.";
            return;
        }

        if (
            !deliveryQuote ||
            deliveryQuote.subtotal !== subtotal
        ) {
            message.textContent =
                "Спочатку розрахуйте вартість доставки.";
            return;
        }

        orderButton.disabled = true;
        orderButton.textContent = "Відправляємо замовлення...";
        message.textContent = "Зачекайте, оформлюємо замовлення...";

        try {
            const response = await fetch(
                `${API_URL}/api/order`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        customerName,
                        phone,
                        address,
                        comment,
                        items: cart.map(item => ({
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity
                        }))
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Не вдалося оформити замовлення."
                );
            }

            message.textContent =
                "Дякуємо! Ваше замовлення прийнято.";

            cart = [];
            saveCart();

            deliveryQuote = null;

            renderCart();
            updateCartCount();

            nameInput.value = "";
            phoneInput.value = "";
            addressInput.value = "";
            commentInput.value = "";

        } catch (error) {
            message.textContent = error.message;

        } finally {
            orderButton.disabled = false;
            orderButton.textContent = "Підтвердити замовлення";
        }
    });
}

renderCart();
updateCartCount();
