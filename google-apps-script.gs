function doGet(e) {
  var response = {
    ok: true,
    service: "AskVeyza Apps Script",
    status: "ready",
    method: "GET",
    message: "Health check OK. Use POST for form submissions.",
    timestamp: new Date().toISOString(),
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = JSON.parse(body);
    var spreadsheet = SpreadsheetApp.openById("1asch8ivEwof9-Zp_2xiu01lVaYluzo80lPonX8tULoY");
    var notifyEmail = data.notifyEmail || "violettabasdenn@gmail.com";

    var source = String(data.source || "").trim();
    if (!source) {
      source = (data.referrerEmail || data.referredEmail) ? "Referral" : "Waitlist";
    }

    if (source === "Referral") {
      spreadsheet.getSheetByName("Referrals").appendRow([
        data.timestamp || new Date(),
        data.referrerName || "",
        data.referrerEmail || "",
        data.referredName || "",
        data.referredEmail || "",
        source,
      ]);
    } else {
      spreadsheet.getSheetByName("Waitlist").appendRow([
        data.timestamp || new Date(),
        data.name || "",
        data.email || "",
        data.business || "",
        data.businessType || "",
        data.website || "",
        source,
      ]);
    }

    MailApp.sendEmail(
      notifyEmail,
      "New AskVeyza Submission",
      JSON.stringify(data, null, 2)
    );

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error && error.message ? error.message : error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
