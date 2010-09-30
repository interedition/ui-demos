
	var curLine=1;
	var curUrl=1;
	var fileContents=[];
	function saveName(fn,winName){
       
		$("#"+winName).parent().html("<span class='fileName' id="+winName+"'>"+fn+"</span>");
	
	}
	function removeFile(fileRemove){
		$(fileRemove).parent().remove();
		
	}
	function removeUrl(fileRemove){
		$(fileRemove).parent().remove();
		
	}
	function showContents(me){
		alert(me.contentWindow.location.href);
		if (me.contentWindow.location.href.substring(me.contentWindow.location.href.lastIndexOf("/")+1) != "fileFrame.html") {
			fileContents.push(me.contentWindow.document.documentElement.innerHTML);
			alert(me.contentWindow.document.documentElement.innerHTML);
		}
		else{
			alert("started");
		}
	}
	function newFileLine(){
	
	fileLine = "<div class='fileLine'><span class='fileBox'><iframe frameborder=0 name='file1' id='file"+curLine+"' class='fileFrame' onload='showContents(this)' src='fileFrame.html'> </iframe></span><span onclick='removeFile(this)' class='divLink'>Remove</span></div>";
	$("#allFiles").append($(fileLine));
	curLine++;
	return;
	}
	function newUrl(){
		var urlLine = "<div><input type='text' name='inputurl' id='url"+curUrl+"' class='textfieldX'/><span id='removeUrl' onclick='removeUrl(this)' class='divLink'>X</span></div>";
		$("#allUrls").append($(urlLine));
		curUrl++;
	}
	function showSubmitted(){
		
	}
	function submitForm(){
		
	}
	function getData(){
		
	}
	$(document).ready(function(e){
		
		newFileLine();
		newUrl();
		$("#addAnother").click(function(e){
			newFileLine();
		});
		$("#addAnotherUrl").click(function(e){
			newUrl();
		});
		
		
	});