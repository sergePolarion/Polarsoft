/*
	@Version=1@

  Job Script used to automate workitem status change based on approvals

	Jean-François Thibeault

  Job Configuration:

  <job cronExpression="0 0/5 * * * ?" disabled="false" id="script.job" name="Update Workitems Status" scope="system">
    <scriptName>workitem-approvalActions-job.js</scriptName>
    <scriptEngine>js</scriptEngine>
    <properties>
      <statusList>routingForApproval,approve;routingForObsolete,makeObsolete</statusList>
      <declinedStatusList>routingForApproval,reject</declinedStatusList>
    </properties>
  </job>

  Where:

	statusList - List of current_status,action that will be taken when ALL invitee have approved the workitem
               Use ";" as separator when multiple status
  declinedStatusList - List of current_status,action that will be taken when ONE of the invitee has disapproved the workitem
                      Use ";" as separator when multiple status
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


    function approveAction(sqlCmd, currentStatus, actionId) {

        logger.info("  ========== ApproveAction for currentStatus: " + currentStatus + " to execute Action: " + actionId + " ==========");
        var workitems = trackerService.getDataService().sqlSearch(sqlCmd);
        logger.info("    -> Found " + workitems.size() + " Workitems ready for this transition");

        for (j = 0; j < workitems.size(); j++) {
            var workitem = workitems.get(j);
            logger.info("      ----- Transitionning Workitem: " + workitem.getId() + " (in project: "+ workitem.getProject().getId() + ") -----");
            ChangeDocumentWorkflowStatus(workitem, currentStatus, actionId, "approveActions");
        }
    }


    function rejectAction(sqlCmd, currentStatus, actionId) {

        logger.info("  ========== rejectAction for currentStatus: " + currentStatus + " to execute Action: " + actionId + " ==========");
        var workitems = trackerService.getDataService().sqlSearch(sqlCmd);
        logger.info("    -> Found " + workitems.size() + " Workitems ready for this transition");

        for (j = 0; j < workitems.size(); j++) {
            var workitem = workitems.get(j);
            logger.info("      ----- Transitionning Workitem: " + workitem.getId() + " (in project: "+ workitem.getProject().getId() + ") -----");
            ChangeDocumentWorkflowStatus(workitem, currentStatus, actionId, "rejectActions");
        }
    }


    function ChangeDocumentWorkflowStatus(workitem, currentStatus, actionId, mode) {
        if (workitem.getStatus().getId() == currentStatus) {
            logger.info("      Changing Workitem Status");

            var actions = workitem.getAvailableActions();

            // If All have accepted and none have rejected or are waiting, then we approve the Workitem
            // ----------------------------------------------------------------------------------------
            if (mode == "approveActions") {
                logger.info("      All have approved");
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
                          workitem.performAction(goActionId);
                          workitem.save();

                        } catch (err) {

                            logger.info("      Peforming the action or saving the workitem failed with this error: " + err);

                        }
                        requestTransactionCommit();
                    }
                }

            }
            // If at least one has rejected, then we reject the Workitem
            // ---------------------------------------------------------
            else if (mode == "rejectActions") {
                logger.info("      At least one user has disapproved the workitem");
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
                          workitem.performAction(goActionId);
                          workitem.save();

                        } catch (err) {

                            logger.info("      Peforming the action or saving the workitem failed with this error: " + err);

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

    logger.info("Workitem Approval Action Job");
    logger.info("Parameters:");
    logger.info(" - Project ID: " + projectId);
    logger.info(" - Status List: " + statusList);
    logger.info(" - Declined Status List: " + declineStatusList);

    var statusArray = statusList.split(";");
    var declinedStatusArray = declinedStatusList.split(";");
    var whereSql = "";
    var valArray = new Array();

    if (statusList) {
      var sql = "SELECT wi.C_PK from POLARION.WORKITEM wi \
where \
EXISTS (select * from POLARION.STRUCT_WORKITEM_APPROVALS approvals where approvals.FK_P_WORKITEM = wi.C_PK AND approvals.C_STATUS = 'approved') \
AND NOT EXISTS (select * from POLARION.STRUCT_WORKITEM_APPROVALS approvals where approvals.FK_P_WORKITEM = wi.C_PK AND approvals.C_STATUS = 'waiting') \
AND NOT EXISTS (select * from POLARION.STRUCT_WORKITEM_APPROVALS approvals where approvals.FK_P_WORKITEM = wi.C_PK AND approvals.C_STATUS = 'disapproved') \
AND ";

      logger.info("//////////////////// Analysing <statusList> ////////////////////")
      for (i = 0; i < statusArray.length; i++) {

          var valuePair = statusArray[i].split(",");
          logger.info("Current Status from <statusList>:" + valuePair[0] + " ActionName:" + valuePair[1]);
          var tempSql = "( wi.C_STATUS = '" + valuePair[0] + "')";
          var sqlQuery = sql + tempSql;
          logger.info("Submitting approveAction with query:" + sqlQuery);
          approveAction(sqlQuery, valuePair[0], valuePair[1]);

      }
    }
    if (declinedStatusList) {
      var sql = "SELECT wi.C_PK from POLARION.WORKITEM wi \
where \
EXISTS (select * from POLARION.STRUCT_WORKITEM_APPROVALS approvals where approvals.FK_P_WORKITEM = wi.C_PK AND approvals.C_STATUS = 'disapproved') \
AND ";

      logger.info("//////////////////// Analysing <declinedStatusList> ////////////////////")
      for (i = 0; i < declinedStatusArray.length; i++) {

          var valuePair = declinedStatusArray[i].split(",");
          logger.info("Current Status from <declinedStatusList>:" + valuePair[0] + " ActionName:" + valuePair[1]);
          var tempSql = "( wi.C_STATUS = '" + valuePair[0] + "')";
          var sqlQuery = sql + tempSql;
          logger.info("Submitting rejectAction with query:" + sqlQuery);
          rejectAction(sqlQuery, valuePair[0], valuePair[1]);

      }
    }

}
