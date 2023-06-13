/*
* Author : 
* Date : 2019-12-19
* Description : This Script is a workflow script for document. It will read the value of custom field from document and create a document baseline
*
* Author: 
* Version 20200731
*           - Renaming the script to createDocumentBaselineWF
*           - Adding BASASELINENAME, BASASELINEDESCRIPTION and BASASELINENAMEPREFIX workflow parameters
*           - Using createObjectBaselineForChange for creating the baseline on new revision being created
*/

// Script parameters
var BASASELINENAME = "baselineName";
var BASASELINENAMEPREFIX = "baselineNamePrefix";
var BASASELINEDESCRIPTION = "baselineDescription";
// Default values for both parameters
var BASELINE_NAME_CF = "cf_baseLineName";
var BASELINE_DESCRIPTION_CF = "cf_baseLineDescription";

// Load required Java Packages (Compatible with Java 7 & 8)
var JavaPackages = new JavaImporter(java.io,
                            java.text,
                            java.lang,
                            java.io,
                            java.lang.io,
                            java.lang.object,
                            java.util,
                            com.polarion.platform,
                            com.polarion.platform.core,
                            com.polarion.platform.context,
                            com.polarion.platform.jobs
                            );
with(JavaPackages)
{

  var VERSION = "20200731";
  var currentdate = new Date();

  var outFile = new FileWriter("./logs/main/createDocumentBaselineWF.log");
  var out = new BufferedWriter(outFile);
  out.write("\n -------------------- Execution of the Workflow Script --------------------"); out.newLine();
  out.write("createDocumentBaselineWF: Version(" + VERSION + ")"); out.newLine();
  out.write("Executed on: " + currentdate); out.newLine();
  out.write("Executed by: " + trackerService.getDataService().getSecurityService().getCurrentUser()); out.newLine();


  // Retrieve workflow parameters
  // ----------------------------
  var baselineNameField = arguments.getAsString(BASASELINENAME, BASELINE_NAME_CF);
  var baselineNamePrefix = arguments.getAsString(BASASELINENAMEPREFIX, "");
  var baselineDescriptionField = arguments.getAsString(BASASELINEDESCRIPTION, BASELINE_DESCRIPTION_CF);

  out.write("Parameters:"); out.newLine();
  out.write(" - " + BASASELINENAME + ": " + baselineNameField); out.newLine();
  out.write(" - " + BASASELINENAMEPREFIX + ": " + baselineNamePrefix); out.newLine();
  out.write(" - " + BASASELINEDESCRIPTION + ": " + baselineDescriptionField); out.newLine();

  var returnValue = "";
  var trackerProject = "";
  var baselinesManager = "";
  var moduleManager = "";
  try
    {
        out.write ("This script will create a document baseline when approving the document\n");

        var document = workflowContext.getTarget();
        var baselineName = document.getCustomField(baselineNameField);
        var baselineDescription = document.getCustomField(baselineDescriptionField);
        if(!baselineName)
            throw "Name is missing";
        if(!baselineDescription)
            baselineDescription = "";

        out.write ("Document Name :"+document.getModuleNameWithSpace()+"\n");
        out.write ("Baseline Name :"+baselineName+"\n");
        out.write ("Document Name :"+baselineDescription+"\n");
        var trackerProject = trackerService.getTrackerProject(document.getProject());
        var baselinesManager = trackerProject.getBaselinesManager();
        var baseline = baselinesManager.createObjectBaselineForChange(document);
        baseline.setName(baselineNamePrefix+baselineName);
        if (baselineDescription.equals(""))
          baseline.setDescription(new com.polarion.core.util.types.Text("text/plain", baselineDescription, false));
        else
          baseline.setDescription(baselineDescription);
        baseline.save();
        out.write ("Baseline Created"+document.getModuleNameWithSpace()+"\n");

    }
    catch(err)
    {
      returnValue = "Not saved. \n"+err.toString();
      out.write("Error : "+err.toString()+ "\n");
    }
    finally
    {
        out.write("End of Log file"+ "\n");
        out.flush();
        out.close();
        returnValue;
    }
}
