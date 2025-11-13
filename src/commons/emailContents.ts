// src/commons/clientWelcomeEmail.ts
export const clientWelcomeEmail = (
  contactPerson: string,
  companyName: string
) => `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color:#f8f8f8; padding:20px;">
  <tr>
    <td align="center">
      <table width="800" cellpadding="20" cellspacing="0" style="background-color:#ffffff; border-radius:8px;">
        <tr>
          <td>
            <p>Dear Sir/Madam,</p>

            <p>Welcome to <strong>CCS - Contractor Compliance Services</strong>! We are thrilled to have you on board and look forward to assisting you with your compliance document preparation needs.</p>

            <p>As your dedicated consultant, our role is to ensure a smooth and efficient process for the preparation of your compliance documents. We will be providing you guidance on the necessary steps and supporting you through each stage of the process.</p>

            <p>Please find attached an introductory guide that outlines our services, the documents we will be preparing together, and the timeline for completion. Your prompt response to requests for information will be crucial in meeting our deadlines.</p>

            <ul>
              <li>Obtain Applicable Contractor's CLRA, BOCW & ISMW License and registration.</li>
              <li>Obtain Registration under Employment Exchange</li>
              <li>Application to Obtain PF Registration code / Ensure PF Registration Certificate.</li>
              <li>Obtain/Ensure LWF Registration of New Vendor</li>
              <li>Intimation to Governance team & Client for license expiry</li>
              <li>Verification and Maintenance of PF Form 11</li>
              <li>Generation of UAN and KYC Approval</li>
              <li>Preparation and Verification of Form A, B, C, D (Maker and Checker)</li>
              <li>Ensure disbursement of salary on or before 7th</li>
              <li>Separate Challan - PF and PT challan Preparation & submission to contractor for payment</li>
              <li>Prepare contractor compliances as per CLRA, Bonus, Leave encashment etc.</li>
              <li>Ensure PT Payment on due course to the appropriate jurisdiction</li>
              <li>Ensure PF Payment on due course and validate the payment</li>
              <li>Monthly, Statutory records preparation, maintenance and repository</li>
              <li>Periodic returns (Covering CLRA, BOCW, ISMW, Register of adult workers, LWF, PT, etc.)</li>
              <li>Notice reply for annual inspection from Labour Office (Additional charges may apply)</li>
            </ul>

            <p>Should you have any questions or require further assistance, here is the escalation matrix to support you on time & every step of the way:</p>

            <p><strong>Level 1: First 48 hours (Mon-Fri 9:15 AM to 5:45 PM, Sat 9:15 AM to 1 PM)</strong><br/>
            To: CCS.Kachchh@gmail.com (63589 37094 / 63589 37091)</p>

            <p><strong>Level 2: 48 to 72 hours</strong><br/>
            To: ComplianceLead.CCS@gmail.com (8469307027 / 8238914176)<br/>
            CC: contractorcompliance.governance@adani.com</p>

            <p><strong>Level 3: After 72 hours</strong><br/>
            To: MD.CCS.kachchh@gmail.com (9924312095)<br/>
            CC: contractorcompliance.governance@adani.com</p>

            <p>Warm Regards,<br/>
            RAJAK TURK.<br/>
            Compliance: +919558107027<br/>
            CCS Helpline: +916358937091<br/>
            CCS Landline: 02838297888<br/>
            <img src="cid:ccslogo" alt="CCS Logo" style="height:50px; margin-top:10px;"/></p>

            <p>For more details visit <a href="http://www.ccsmundra.in">www.ccsmundra.in</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;
