import { createId } from '../utils/id';
import type { PersonEntry, ReportDocument } from '../types/report';

function emptyPerson(): PersonEntry {
  return {
    id: createId('person'),
    name: '',
    title: '',
    company: '',
    date: '',
    signaturePresent: false,
  };
}

/** Produces a brand-new, empty report document with sensible placeholder text
 * drawn from the template structure (not real client data). Every field is
 * editable in the UI; nothing here is hard-coded into the render layer.
 */
export function createDefaultReportDocument(): ReportDocument {
  const now = new Date().toISOString();
  return {
    id: createId('doc'),
    documentType: 'report',
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    lockedAt: null,
    lockedBy: null,
    lockedByDisplayName: null,
    documentInfo: {
      reportTitle: 'Thermal Mapping Report',
      systemName: 'Long Term Walk-In Stability Chamber',
      systemCode: 'QC-STB-01',
      clientName: '',
      clientSite: '',
      clientLogoDataUrl: null,
      performingCompanyName: '',
      performingCompanyLogoDataUrl: null,
      documentNumber: '',
      revisionNumber: '01',
      formReference: '',
      issueDate: new Date().toISOString().slice(0, 10),
      contactAddressLines: [],
      contactPhones: [],
      contactEmail: '',
    },
    approval: {
      tagAuthors: [emptyPerson()],
      tagTesters: [emptyPerson()],
      tagReviewers: [emptyPerson()],
      clientReviewers: [emptyPerson()],
      approvers: [emptyPerson()],
    },
    introduction: {
      purpose:
        'To evaluate the heat distribution profiles and trends throughout the storage area of the chamber; to confirm temperature and relative humidity are controlled; and to identify the hottest and coldest points for routine monitoring.',
      scope:
        'This report covers the performance of temperature mapping of all storage areas in the chamber described in this document.',
    },
    rolesResponsibilities: {
      clientEngineeringValidation: [
        { id: createId('resp'), text: 'To support the report issuing phase.' },
        { id: createId('resp'), text: 'To review the report for execution.' },
        { id: createId('resp'), text: 'To plan the execution of the protocol.' },
      ],
      clientQuality: [
        { id: createId('resp'), text: 'To approve the report for execution.' },
        { id: createId('resp'), text: 'To approve the final report and summary.' },
        { id: createId('resp'), text: 'To approve the qualified system.' },
        { id: createId('resp'), text: 'To manage changes.' },
        { id: createId('resp'), text: 'To coordinate the thermal mapping study.' },
      ],
      performingCompany: [
        {
          id: createId('resp'),
          text: 'Prepare the qualification protocol, including all recommendations and corrections required by the client.',
        },
        { id: createId('resp'), text: 'Execute tests and/or verifications only after the report has been approved.' },
        {
          id: createId('resp'),
          text: 'Assure that each instrument used is calibrated before use and that a copy of the certificate is included in the final report.',
        },
        {
          id: createId('resp'),
          text: 'Assure that data from tests/verifications are properly recorded in an acceptable format.',
        },
        {
          id: createId('resp'),
          text: 'Store the raw data/verifications and compare test results to acceptance criteria.',
        },
      ],
    },
    chamberDescription: {
      systemName: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      innerSizeText: '',
      code: '',
      location: '',
      acceptanceCriteria: {
        temperatureMinC: 28,
        temperatureMaxC: 32,
        humidityMinPct: 60,
        humidityMaxPct: 70,
      },
      settingTemperatureC: 30,
      settingHumidityPct: 65,
      numberOfDataLoggers: 0,
      loadingVolumeLiters: 0,
      samplingPeriodHours: 24,
      sampleFrequencyMinutes: 2,
    },
    loadingItems: [],
    chamberLayout: {
      layoutImageDataUrl: null,
      photos: [],
      dataloggers: [],
      airSupplyLabel: 'Supply Air',
      airReturnLabel: 'Return Air',
      doorLabel: 'Door',
    },
    studyPeriod: {
      startDateTime: '',
      endDateTime: '',
    },
    challengeTests: [
      {
        id: createId('challenge'),
        type: 'powerFailure',
        date: '',
        startTime: '',
        endTime: '',
        plannedDurationMinutes: 30,
      },
      {
        id: createId('challenge'),
        type: 'openDoor',
        date: '',
        startTime: '',
        endTime: '',
        plannedDurationMinutes: 5,
      },
    ],
    calibrationRecords: [],
    narrative: {
      requirementsText:
        'Temperature and relative humidity monitoring uses pre-checked data loggers. Temperature mapping is performed on all storage areas to confirm that every location remains within the specified limits across seasonal variation, with the chamber mapped empty to capture worst-case conditions.',
      locationsJustificationText:
        'Because heat rises and cold settles, data loggers are placed at both the top and bottom of each location. Shelving and stored product can create hot spots by obstructing air circulation, so loggers are also placed near corners where airflow is weakest. Loggers are distributed uniformly across all vertical planes; exact positions are shown in the layout diagram.',
      proceduresText:
        'Each data logger is labeled with its serial number and programmed with the study start/stop dates and sampling interval before being placed at its predefined location. After the exposure period, loggers are collected and their data downloaded, reviewed to identify the hottest and coldest points and to calculate the mean kinetic temperature, and the hottest point is marked for routine monitoring. Any excursions during power-failure or door-opening interventions are noted along with the time required to recover.',
      revalidationFrequencyText:
        'Temperature mapping should be repeated after significant modification to the premises or changes in stock layout. Revalidation frequency: annually (every 12 months).',
      resultEvaluationText:
        'Observations shall be collected and attached to this report. The thermal mapping of the chamber shall be qualified if the temperature and relative humidity observed during the study are found within the specified limits, and the location for routine temperature monitoring is fixed.',
      summaryConclusionText:
        'A final report shall be prepared to draw the necessary conclusions, including recommending any changes necessary to approve the chamber conditions.',
      deviationText: 'Any deviation during the thermal mapping study shall be recorded and its impact evaluated on review of results.',
      references: [
        'IMB Guide to Control and Monitoring of Storage and Transportation Temperature Conditions for Medicinal Products and Active Substances.',
        'WHO Annex 9: Model guidance for the storage and transport of time- and temperature-sensitive pharmaceutical products.',
        'ISPE Good Practice Guide - Cold Chain Management.',
        '21 CFR 211.142 and 211.150: Storage and Distribution.',
      ],
    },
    sopAvailability: [],
    deviations: [],
    finalApproval: {
      verdict: null,
      notes: '',
      approvers: [emptyPerson()],
    },
    attachments: [
      { id: createId('att'), description: 'Charts', numberOfPages: '' },
      { id: createId('att'), description: 'Calibration certificates', numberOfPages: '' },
      { id: createId('att'), description: 'Raw Data', numberOfPages: 'CD' },
    ],
    auditLog: [],
  };
}
