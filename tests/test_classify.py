from e80kb.ingest.classify import classify, process_lineage


def test_project_document():
    meta = classify("Projects/Rinnovi Offerte H24/01. Project opening/H24 OFFERS - Project Charter_Rev1.pdf")
    assert meta.project == "Rinnovi Offerte H24"
    assert meta.phase == "01. Project opening"
    assert meta.source == "sharepoint"
    assert meta.type == "Charter"
    assert meta.acl == "Internal"
    assert meta.process is None


def test_it_internal_folder_is_restricted():
    meta = classify("Projects/Document Automation/00. IT Internal Documents/E80 Inc - AP Processes/Tariff Invoice Process.docx")
    assert meta.acl == "IT"


def test_process_variant_from_file_name():
    meta = classify("Processes/PTP.04/PTP.04.07/PTP.04.07 - Put-away Coordination (EL80).pdf")
    assert meta.process == "PTP.04.07 (EL80)"
    assert meta.process_name == "Put-away Coordination (EL80)"
    assert meta.type == "ProcessMap"
    assert meta.source == "signavio"


def test_process_version_code():
    assert classify("Processes/LTC.04/LTC_04_01_v8 - H24 renewal quotation.pdf").process == "LTC.04.01.v8"


def test_subprocess_takes_folder_code():
    assert classify("Processes/PTP.01/PTP.01.01/Internal review.pdf").process == "PTP.01.01 > Internal review"
    assert classify("Processes/LTC.04/Subprocesses/Create RSPL.pdf").process == "LTC.04 > Create RSPL"


def test_project_files_have_no_process():
    # "MIT.01" looks like a process code but lives in a project folder.
    meta = classify("Projects/Qualifica fornitori/04. Business Blueprint/Set/MIT.01_rev. 1_Cybersecurity.pdf")
    assert meta.process is None


def test_lineage():
    assert process_lineage("PTP.05.02 (Invoice without a PO)") == [
        ("PTP.05.02 (Invoice without a PO)", "VARIANT_OF", "PTP.05.02"),
        ("PTP.05.02", "PART_OF", "PTP.05"),
        ("PTP.05", "PART_OF", "PTP"),
    ]
    assert process_lineage("LTC.04.01.v8")[0] == ("LTC.04.01.v8", "VARIANT_OF", "LTC.04.01")
    assert process_lineage("PTP.01.01 > Internal review")[0] == ("PTP.01.01 > Internal review", "PART_OF", "PTP.01.01")
