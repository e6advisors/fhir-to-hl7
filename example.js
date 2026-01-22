/**
 * Example usage of the FHIR to HL7 Converter Library
 */

import { 
  convertFHIRToHL7, 
  validateFHIRResource, 
  getSampleFHIRPatient,
  getSampleFHIRBundle
} from './src/fhirToHl7Service.js';

// Example 1: Using the sample Patient
console.log('=== Example 1: Sample FHIR Patient ===\n');
const samplePatient = getSampleFHIRPatient();
console.log('FHIR Patient Resource:');
console.log(JSON.stringify(samplePatient, null, 2).substring(0, 500) + '...');
console.log('\n---\n');

if (validateFHIRResource(samplePatient)) {
  const hl7Message = convertFHIRToHL7(samplePatient);
  console.log('HL7 Message:');
  console.log(hl7Message);
} else {
  console.error('Invalid FHIR resource');
}

console.log('\n\n');

// Example 2: Using a FHIR Bundle
console.log('=== Example 2: Sample FHIR Bundle ===\n');
const sampleBundle = getSampleFHIRBundle();
console.log('FHIR Bundle:');
console.log(`  Type: ${sampleBundle.type}`);
console.log(`  Total Resources: ${sampleBundle.entry.length}`);
sampleBundle.entry.forEach((entry, index) => {
  console.log(`  ${index + 1}. ${entry.resource.resourceType} (${entry.resource.id})`);
});
console.log('\n---\n');

const hl7Message = convertFHIRToHL7(sampleBundle);
console.log('HL7 Message:');
console.log(hl7Message);
console.log('\n---\n');
console.log('Segments:');
hl7Message.split('\r').forEach((segment, index) => {
  const segmentType = segment.split('|')[0];
  console.log(`  ${index + 1}. ${segmentType}`);
});

console.log('\n\n');

// Example 3: Custom Patient with options
console.log('=== Example 3: Custom Patient with Options ===\n');
const customPatient = {
  resourceType: 'Patient',
  id: 'patient-1',
  identifier: [{
    system: 'http://hospital.org/mrn',
    value: 'MRN999888777',
    type: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
        code: 'MR',
        display: 'Medical Record Number'
      }]
    }
  }],
  name: [{
    use: 'official',
    family: 'SMITH',
    given: ['JANE', 'MARIE'],
    suffix: ['MD']
  }],
  gender: 'female',
  birthDate: '1990-05-20',
  address: [{
    use: 'home',
    line: ['456 OAK AVENUE'],
    city: 'SPRINGFIELD',
    state: 'IL',
    postalCode: '62701',
    country: 'USA'
  }],
  telecom: [{
    system: 'phone',
    value: '217-555-1234',
    use: 'home'
  }]
};

console.log('FHIR Patient:');
console.log(JSON.stringify(customPatient, null, 2));
console.log('\n---\n');

const hl7WithOptions = convertFHIRToHL7(customPatient, {
  sendingApplication: 'MyFHIRApp',
  sendingFacility: 'MyHospital',
  receivingApplication: 'HL7System',
  receivingFacility: 'TargetFacility',
  processingId: 'P',
  versionId: '2.5'
});

console.log('HL7 Message (with custom options):');
console.log(hl7WithOptions);

console.log('\n\n');

// Example 4: Patient with Encounter (determines message type)
console.log('=== Example 4: Patient with Encounter ===\n');
const patientWithEncounter = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: {
        resourceType: 'Patient',
        id: 'patient-1',
        identifier: [{
          value: 'MRN111222333',
          type: { coding: [{ code: 'MR' }] }
        }],
        name: [{
          family: 'JOHNSON',
          given: ['ROBERT']
        }],
        gender: 'male',
        birthDate: '1975-03-15'
      }
    },
    {
      resource: {
        resourceType: 'Encounter',
        id: 'encounter-1',
        status: 'in-progress',
        class: {
          code: 'IMP',
          display: 'inpatient encounter'
        },
        subject: {
          reference: 'Patient/patient-1'
        },
        period: {
          start: '2024-01-15T08:00:00'
        },
        location: [{
          location: {
            display: 'ICU^201^B'
          }
        }]
      }
    }
  ]
};

const hl7Encounter = convertFHIRToHL7(patientWithEncounter);
console.log('HL7 Message (Patient + Encounter):');
console.log(hl7Encounter);
console.log('\n---\n');
console.log('Message Type: ADT^A01 (Patient Admit - because Encounter status is in-progress)');

console.log('\n\n');

// Example 5: Validation
console.log('=== Example 5: Validation ===\n');
const invalidResource = { id: 'test' };
console.log(`Resource: ${JSON.stringify(invalidResource)}`);
console.log(`Valid: ${validateFHIRResource(invalidResource)}`);

const validResource = { resourceType: 'Patient', id: 'patient-1' };
console.log(`\nResource: ${JSON.stringify(validResource)}`);
console.log(`Valid: ${validateFHIRResource(validResource)}`);

console.log('\n\n');

// Example 6: Multiple resources of same type
console.log('=== Example 6: Multiple Observations ===\n');
const bundleWithMultipleObs = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [
    {
      resource: {
        resourceType: 'Patient',
        id: 'patient-1',
        name: [{ family: 'TEST', given: ['PATIENT'] }],
        gender: 'male'
      }
    },
    {
      resource: {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        subject: { reference: 'Patient/patient-1' },
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate'
          }]
        },
        valueQuantity: {
          value: 72,
          unit: '/min'
        }
      }
    },
    {
      resource: {
        resourceType: 'Observation',
        id: 'obs-2',
        status: 'final',
        subject: { reference: 'Patient/patient-1' },
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '9279-1',
            display: 'Respiratory rate'
          }]
        },
        valueQuantity: {
          value: 16,
          unit: '/min'
        }
      }
    }
  ]
};

const hl7MultipleObs = convertFHIRToHL7(bundleWithMultipleObs);
console.log('HL7 Message (with multiple Observations):');
console.log(hl7MultipleObs);
console.log('\n---\n');
console.log('Note: Multiple OBX segments are created with sequential set IDs (OBX-1)');
