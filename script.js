let device;

async function connectToPrinter() {
    try {
        device = await navigator.usb.requestDevice({
            filters: [{ vendorId: 0x1fc9 }]
        });

        await device.open();
        if (device.configuration === null) {
            await device.selectConfiguration(1);
        }
        await device.claimInterface(0);

        console.log("اتصال به پرینتر موفقیت‌آمیز بود.");
        return true;
    } catch (error) {
        console.error("خطا در اتصال به پرینتر:", error);
        return false;
    }
}

async function printReceipt(text) {
    if (!device) {
        console.error("لطفاً ابتدا به پرینتر متصل شوید.");
        return;
    }

    try {
        // تنظیم سبک چاپ (وسط چین)
        const centerAlignCommand = new Uint8Array([0x1B, 0x61, 0x01]);
        await device.transferOut(1, centerAlignCommand);

        // تبدیل متن به آرایه بایت
        const encoder = new TextEncoder();
        const data = encoder.encode(text);

        // ارسال داده برای چاپ
        await device.transferOut(1, data);

        // اضافه کردن فاصله
        const newLines = new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A]);
        await device.transferOut(1, newLines);

        // دستور برش کاغذ
        const cutPaperCommand = new Uint8Array([0x1D, 0x56, 0x41, 0x00]);
        await device.transferOut(1, cutPaperCommand);

        console.log("چاپ با موفقیت انجام شد.");
    } catch (error) {
        console.error("خطا در چاپ:", error);
        throw error;
    }
}

async function disconnectPrinter() {
    if (device) {
        await device.close();
        device = null;
        console.log("اتصال پرینتر قطع شد.");
    }
}

// استفاده از توابع
document.getElementById('connectButton').addEventListener('click', connectToPrinter);

document.getElementById('printButton').addEventListener('click', async () => {
    if (!device) {
        alert("لطفاً ابتدا به پرینتر متصل شوید.");
        return;
    }
    try {
        await printReceipt("این یک تست چاپ است!");
    } catch (error) {
        alert("خطا در چاپ: " + error.message);
    }
});

document.getElementById('disconnectButton').addEventListener('click', disconnectPrinter);
