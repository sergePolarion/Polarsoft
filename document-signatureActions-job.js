/*
	@Version=4@

  Job Script used to automate document status change based on signatures

	Jean-François Thibeault

  Job Configuration:

  <job cronExpression="0 0/5 * * * ?" disabled="false" id="script.job" name="Signature Actions" scope="system">
    <scriptName>document-signatureActions-job.js</scriptName>
    <scriptEngine>js</scriptEngine>
    <properties>
      <statusList>routingForApproval,approved,approve;routingForObsolete,obsolete,makeObsolete</statusList>
      <declinedStatusList>routingForApproval,approved,reject</declinedStatusList>
    </properties>
  </job>

  Where:

	statusList - List of current_status,target_signature_status,action that will be taken when ALL invitee have signed the document
               Use ";" as separator when multiple status
  declinedStatusList - List of current_status,target_signature_status,action that will be taken when ONE of the invitee has declined the signature
                      Use ";" as separator when multiple status

                      NOTE: The target_signature_status for declined signature might the the same as for the approved ones since signatures
                            typically brings you to an approved status. In this case, you have sometime another transition to
                            a rejected status via another action.  In all case, the "target_status" MUST be the signature one.
*/


var JavaPackages = new JavaImporter(java.io,
    java.text,
    java.lang,
    java.lang.io,
    java.lang.object,
    java.util,
    com.polarion.platform,
    com.polarion.platform.core,
    com.polarion.platform.context,
    com.polarion.platform.jobs);
with(JavaPackages) {


    function approveAction(sqlCmd, currentStatus, targetStatus, actionId) {

        logger.info("  ========== ApproveAction for currentStatus: " + currentStatus + " TO targetStatus: " + targetStatus + " ==========");
        var documents = trackerService.getDataService().sqlSearch(sqlCmd);
        logger.info("    -> Found " + documents.size() + " Documents ready for this transition");

        for (j = 0; j < documents.size(); j++) {
            var document = documents.get(j);
            logger.info("      ----- Transitionning Document: " + document.getTitle()  + " -----");
            var newDocumentStatus = document.getEnumerationOptionForField("status", targetStatus);
            ChangeDocumentWorkflowStatus(document, currentStatus, actionId, "approveActions");
        }
    }


    function rejectAction(sqlCmd, currentStatus, targetStatus, actionId) {

        logger.info("  ========== rejectAction for currentStatus: " + currentStatus + " targetStatus: " + targetStatus + " ==========");
        var documents = trackerService.getDataService().sqlSearch(sqlCmd);
        logger.info("    -> Found " + documents.size() + " Documents ready for this transition");

        for (j = 0; j < documents.size(); j++) {
            var document = documents.get(j);
            logger.info("      ----- Transitionning Document: " + document.getTitle() + " -----");
            var newDocumentStatus = document.getEnumerationOptionForField("status", targetStatus);
            ChangeDocumentWorkflowStatus(document, currentStatus, actionId, "rejectActions");
        }
    }

    function main() {

        // Change document workflow status (based on signature status)
        // -----------------------------------------------------------
        ChangeDocumentWorkflowStatus();

    } // function



    function ChangeDocumentWorkflowStatus(document, currentStatus, actionId, mode) {
        if (document.getStatus().getId() == currentStatus) {
            logger.info("      Changing Document Status");

            var signatures = document.getWorkflowSignatures();
            var yes = 0;
            var no = 0;
            var wait = 0;

            if (signatures.size() > 0) {
                for (var i = 0; i < signatures.size(); i++) {
                    // logger.info(signatures.get(i).getSignatureState())
                    if (signatures.get(i).getSignatureState().getId() == "declined") {
                        no++;
                        var signatureItem = signatures.get(i);
                        logger.info("      We found a declined signature - " + signatureItem);
                    }
                }

            }


            var actions = document.getAvailableActions();

            // If All have accepted and none have rejected or are waiting, then we approve the Document
            // ----------------------------------------------------------------------------------------
            if (mode == "approveActions") {
                logger.info("      All have accepted");
                var actionIsFound = 0;
                var goActionId = -1;
                for (i = 0; i < actions.length; i++) {
                    logger.info("      Looking for: " + actions[i].getActionId() + ":::" + actions[i].getActionName() + ":::" + actions[i].getNativeActionId());
                    if (actions[i].getNativeActionId() == actionId) {
                        logger.info("      Action is found");
                        requestTransactionBegin();
                        try {
                          goActionId = actions[i].getActionId();
                          logger.info("      Perform the ActionId: " + goActionId);
                          document.performAction(goActionId);
                          document.save();

                        } catch (err) {

                            logger.info("      Peforming the action or saving the document failed with this error: " + err);

                        }
                        requestTransactionCommit();
                    }
                }

            }
            // If at least one has rejected, then we reject the Document
            // ---------------------------------------------------------
            else if (mode == "rejectActions") {
                logger.info("      At least one user has declined its signature");
                var actionIsFound = 0;
                var goActionId = -1;
                for (i = 0; i < actions.length; i++) {
                    logger.info("      Looking for: " + actions[i].getActionId() + ":::" + actions[i].getActionName() + ":::" + actions[i].getNativeActionId());
                    if (actions[i].getNativeActionId() == actionId) {
                        logger.info("      Action is found")
                        requestTransactionBegin();
                        try {
                          goActionId = actions[i].getActionId();
                          logger.info("      Perform the ActionId: " + goActionId);
                          document.performAction(goActionId);
                          document.save();

                        } catch (err) {

                            logger.info("      Peforming the action or saving the document failed with this error: " + err);

                        }
                        requestTransactionCommit();
                    }
                }
            }
        }
    }

    function requestTransactionBegin() {

        var myDate = new Date().toLocaleString();
        if (txService.canBeginTx()) {
            myDate = new Date().toLocaleString();
            logger.info("      " + myDate + "::Starting a New Transaction");
            txService.beginTx();
            if (txService.txExists()) {
                myDate = new Date().toLocaleString();
                logger.info("      " + myDate + "::A new Transaction was Created");
            }
        } else {
            if (txService.txExists()) {
                myDate = new Date().toLocaleString();
                logger.info("      " + myDate + "::A Transaction exists, Committing it and starting another.");
                txService.commitTx();
                txService.beginTx();
                if (txService.txExists()) {
                    myDate = new Date().toLocaleString();
                    logger.info("      " + myDate + "::A new Transaction was Created");

                }

            } else {
                myDate = new Date().toLocaleString();
                logger.info("      " + myDate + "::Waiting 10 Seconds");
                myDate = new Date().toLocaleString();
                logger.info("      " + myDate + "::Try to Begin another Transaction");
                if (txService.canBeginTx()) {
                    txService.beginTx();
                }
                if (txService.txExists()) {
                    myDate = new Date().toLocaleString();
                    logger.info("      " + myDate + "::A new Transaction was Created");
                }
            }
        }
    }


    function requestTransactionCommit() {

        var myDate = new Date().toLocaleString();
        if (txService.txExists() == true) {
            myDate = new Date().toLocaleString();
            logger.info("      " + myDate + "::Committing a Transaction");
            try {

                txService.commitTx();

            } catch (err) {

                logger.info("      " + myDate + "::The first attempt at the transaction failed.  Waiting 1 second and retrying.");
                requestTransactionCommit();

            }

            if (txService.txExists() == false) {
                myDate = new Date().toLocaleString();
                logger.info("      " + myDate + "::The Transaction was committed.");
            }

        } else {
            myDate = new Date().toLocaleString();
            logger.info("      " + myDate + "::No Transaction to Commit!");
        }

    }


    var txService = com.polarion.platform.core.PlatformContext.getPlatform().lookupService(com.polarion.platform.ITransactionService.class);
    var dataService = trackerService.getDataService();
    var moduleManager = trackerService.getModuleManager();
    var projectsService = trackerService.getProjectsService();
    var securityService = trackerService.getDataService().getSecurityService();

    var debugLevel = 1;
    var notCopiedCustomFields = new HashSet();
    var convertedCopiedCustomFields = new HashSet();

    logger.info("Document Signature Action Job");
    logger.info("Parameters:");
    logger.info(" - Project ID: " + projectId);
    logger.info(" - Status List: " + statusList);
    logger.info(" - Declined Status List: " + declineStatusList);

    var statusArray = statusList.split(";");
    var declinedStatusArray = declinedStatusList.split(";");
    var whereSql = "";
    var valArray = new Array();


    if (statusList) {
      var sql = "select DOC.C_PK from POLARION.MODULE DOC \
RIGHT OUTER JOIN  POLARION.DOCUMENTWORKFLOWSIGNATURE WFSIG \
ON DOC.C_URI = WFSIG.FK_URI_WORKFLOWOBJECT \
WHERE WFSIG.C_SIGNATURESTATE='ready' AND ";

      logger.info("//////////////////// Analysing <statusList> ////////////////////")
      for (i = 0; i < statusArray.length; i++) {

          var valuePair = statusArray[i].split(",");
          logger.info("Current Status from <statusList>:" + valuePair[0] + " Target Status:" + valuePair[1] + " ActionName:" + valuePair[2]);
          var tempSql = "( DOC.C_STATUS = '" + valuePair[0] + "' AND WFSIG.C_TARGETSTATUSID = '" + valuePair[1] + "')";
          var sqlQuery = sql + tempSql;
          logger.info("Submitting approveAction with query:" + sqlQuery);
          approveAction(sqlQuery, valuePair[0], valuePair[1], valuePair[2]);

      }
    }

    if (declinedStatusList) {
      var sql = "select DOC.C_PK from POLARION.MODULE DOC \
RIGHT OUTER JOIN  POLARION.DOCUMENTWORKFLOWSIGNATURE WFSIG \
ON DOC.C_URI = WFSIG.FK_URI_WORKFLOWOBJECT \
WHERE WFSIG.C_SIGNATURESTATE='declined' AND ";

      logger.info("//////////////////// Analysing <declinedStatusList> ////////////////////")
      for (i = 0; i < declinedStatusArray.length; i++) {

          var valuePair = declinedStatusArray[i].split(",");
          logger.info("Current Status from <declinedStatusList>:" + valuePair[0] + " Target Status:" + valuePair[1] + " ActionName:" + valuePair[2]);
          var tempSql = "( DOC.C_STATUS = '" + valuePair[0] + "' AND WFSIG.C_TARGETSTATUSID = '" + valuePair[1] + "')";
          var sqlQuery = sql + tempSql;
          logger.info("Submitting rejectAction with query:" + sqlQuery);
          rejectAction(sqlQuery, valuePair[0], valuePair[1], valuePair[2]);

      }

  }

}
