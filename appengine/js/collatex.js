  var curUrl=1;

  function removeUrl(fileRemove){
    $(fileRemove).parent().remove();
  }

  function newUrl(){
    var urlLine = "<div><input type='text' name='url"+curUrl+"' id='url"+curUrl+"' class='textfieldX'/><div id='removeUrl' onclick='removeUrl(this)' class='divLink ui-button-icon-primary ui-icon ui-icon-cancel' style='float: right; margin-right: 15px; margin-top:2px;'></div></div>";
    $("#allUrls").append($(urlLine));
    curUrl++;
  }

  function submitForm(){
    urls = $('#choosefile').serialize();
    $.getJSON('/return_texts', urls, function(data) {
      $('#submittedFileList').html('');
      if( data ) { $('#submitted_div').show(); }
      $.each( data, function( file_name, texts ) {
        text_nr = 0;
        $.each( texts, function( index, properties ) {
          text_nr++;
          text_id = properties.text;
          auto_sigil = properties.autosigil;
          // properties.parent -> ignored for now
          text_form_item = '<li><input type="checkbox" checked="true" value="' + text_id + '"></input><input type="text" class="textfieldX sigil" name="sigil_' + text_id + '" id="sigil_' + text_id + '" value="' + auto_sigil + '"/><span class="text_name">' + file_name + ' (' + text_nr + ')</span></li>';
          $('#submittedFileList').append( text_form_item );
        }); 
      });
    });
  }
  
  function getTokens(){
    $('#Configureform').submit();
  }

  $(document).ready(function(e){
    newUrl();
    $("#addAnotherUrl").click(function(e){
      newUrl();
    });
  });
