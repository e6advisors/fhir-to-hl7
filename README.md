# FHIR to HL7 Converter Library

A comprehensive JavaScript library for converting FHIR R4-compliant resources into HL7 v2.x messages. This library provides extensive mapping of FHIR resources to HL7 segments following HL7 FHIR mapping guidelines and industry best practices.

## Features

- **Comprehensive Resource Mapping**: Converts all major FHIR resources to corresponding HL7 segments
- **HL7 v2.5 Compliant**: Produces HL7 v2.5-compliant messages following official specifications
- **Intelligent Message Type Detection**: Automatically determines appropriate ADT message types based on Encounter status
- **Multiple Resource Support**: Handles Patient, Encounter, RelatedPerson, Observation, AllergyIntolerance, Condition, and more
- **Bundle Support**: Accepts single resources, arrays of resources, or FHIR Bundles
- **Proper Field Mapping**: Maps FHIR fields to HL7 segments with correct component separation
- **Terminology Mapping**: Proper mapping from FHIR code systems to HL7 codes
- **Zero Dependencies**: Pure JavaScript with no external dependencies

## Supported FHIR Resources → HL7 Segments

| FHIR Resource | HL7 Segment | Description |
|--------------|-------------|-------------|
| Patient | PID | Patient demographics, identifiers, race/ethnicity, contact information |
| Encounter | PV1 | Visit information, location, dates, providers, financial class, discharge disposition |
| RelatedPerson | NK1 | Next of kin, emergency contacts, relationships |
| Observation | OBX | Clinical observations, lab results with value types, units, and status |
| AllergyIntolerance | AL1 | Allergies with severity, reactions, and identification dates |
| Condition | DG1 | Diagnoses with coding systems, dates, and diagnosis types |
| MessageHeader | MSH | Message metadata (auto-generated) |
| Event | EVN | Event type (auto-generated) |

## Installation

### Node.js

```bash
npm install fhir-to-hl7
```

Or copy the `src/fhirToHl7Service.js` file directly into your project.

### Browser

Include the script in your HTML:

```html
<script src="fhirToHl7Service.js"></script>
```

## Usage

### Basic Usage

```javascript
import { convertFHIRToHL7, validateFHIRResource } from 'fhir-to-hl7';

// Your FHIR Patient resource
const patient = {
  resourceType: 'Patient',
  id: 'patient-1',
  identifier: [{
    system: 'http://hospital.org/mrn',
    value: 'MRN123456789',
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
    family: 'DOE',
    given: ['JOHN', 'MIDDLE'],
    suffix: ['JR']
  }],
  gender: 'male',
  birthDate: '1980-01-15',
  address: [{
    use: 'home',
    line: ['123 MAIN ST'],
    city: 'CITY',
    state: 'ST',
    postalCode: '12345',
    country: 'USA'
  }],
  telecom: [{
    system: 'phone',
    value: '555-123-4567',
    use: 'home'
  }]
};

// Validate the resource
if (validateFHIRResource(patient)) {
  // Convert to HL7
  const hl7Message = convertFHIRToHL7(patient);
  console.log(hl7Message);
} else {
  console.error('Invalid FHIR resource');
}
```

### Example Output

**Input (FHIR Patient):**
```json
{
  "resourceType": "Patient",
  "identifier": [{
    "value": "MRN123456789",
    "type": { "coding": [{ "code": "MR" }] }
  }],
  "name": [{
    "family": "DOE",
    "given": ["JOHN", "MIDDLE"],
    "suffix": ["JR"]
  }],
  "gender": "male",
  "birthDate": "1980-01-15"
}
```

**Output (HL7):**
```
MSH|^~\&|FHIR-HYDRANT|FHIR-HYDRANT-FACILITY|RECEIVING-APP|RECEIVING-FACILITY|20240101120000||ADT^A08^ADT_A08|MSG20240101120000123|P|2.5
EVN|A08|20240101120000||||SendingUserID
PID|1||MRN123456789^^^http://hospital.org/mrn^MR||DOE^JOHN^MIDDLE^JR||19800115|M||||123 MAIN ST^^CITY^ST^12345^USA||555-123-4567
```

### Using with FHIR Bundle

```javascript
import { convertFHIRToHL7, getSampleFHIRBundle } from 'fhir-to-hl7';

// Convert a FHIR Bundle
const bundle = getSampleFHIRBundle();
const hl7Message = convertFHIRToHL7(bundle);
console.log(hl7Message);
```

## API Reference

### `convertFHIRToHL7(fhirResource, options)`

Converts FHIR resource(s) to an HL7 message.

**Parameters:**
- `fhirResource` (Object|Array|Bundle): FHIR resource, array of resources, or Bundle
- `options` (Object, optional): Configuration for MSH segment:
  - `sendingApplication` (string): Sending application name
  - `sendingFacility` (string): Sending facility name
  - `receivingApplication` (string): Receiving application name
  - `receivingFacility` (string): Receiving facility name
  - `processingId` (string): Processing ID (P=Production, T=Test)
  - `versionId` (string): HL7 version ID (default: '2.5')

**Returns:**
- `string`: HL7 message string with segments separated by `\r`

**Throws:**
- `Error`: If resource is invalid or Patient resource is missing

**Example:**
```javascript
const hl7Message = convertFHIRToHL7(patient, {
  sendingApplication: 'MyApp',
  sendingFacility: 'MyFacility',
  receivingApplication: 'TargetApp',
  receivingFacility: 'TargetFacility'
});
```

### `validateFHIRResource(resource)`

Validates that a resource is a valid FHIR resource.

**Parameters:**
- `resource` (Object): Resource to validate

**Returns:**
- `boolean`: `true` if resource appears valid, `false` otherwise

**Example:**
```javascript
if (validateFHIRResource(patient)) {
  const hl7Message = convertFHIRToHL7(patient);
}
```

### `getSampleFHIRPatient()`

Returns a sample FHIR Patient resource for testing.

**Returns:**
- `Object`: Sample FHIR Patient resource

**Example:**
```javascript
const sample = getSampleFHIRPatient();
const hl7Message = convertFHIRToHL7(sample);
```

### `getSampleFHIRBundle()`

Returns a comprehensive sample FHIR Bundle with multiple resources.

**Returns:**
- `Object`: Sample FHIR Bundle containing Patient, Encounter, RelatedPerson, Observation, AllergyIntolerance, and Condition

**Example:**
```javascript
const bundle = getSampleFHIRBundle();
const hl7Message = convertFHIRToHL7(bundle);
```

## Message Type Determination

The converter automatically determines the appropriate HL7 message type based on the Encounter resource status:

| Encounter Status | Message Type | Event Type | Description |
|-----------------|--------------|------------|-------------|
| `planned` | ADT^A04 | A04 | Patient Register |
| `arrived`, `in-progress` | ADT^A01 | A01 | Patient Admit |
| `finished`, `cancelled` | ADT^A03 | A03 | Patient Discharge |
| `onleave` | ADT^A14 | A14 | Pending Admit |
| No Encounter | ADT^A08 | A08 | Patient Update |
| Default (inpatient) | ADT^A01 | A01 | Patient Admit |

## Resource Conversion Details

### Patient → PID Segment

- **Identifiers**: MRN, SSN, Driver's License, Account Number (mapped to appropriate PID fields)
- **Names**: All name components (family, given, middle, suffix, prefix) properly mapped
- **Demographics**: Gender, birth date, death date/indicator
- **Race/Ethnicity**: US Core extensions mapped to PID-10 and PID-22
- **Addresses**: Multiple addresses with proper use codes
- **Contact Information**: Phone numbers (home, work) mapped to PID-13 and PID-14
- **Marital Status**: Mapped to PID-16
- **Language**: Primary language mapped to PID-15
- **Extensions**: Birth place, citizenship, multiple birth indicator, etc.

### Encounter → PV1 Segment

- **Patient Class**: FHIR encounter class mapped to HL7 patient class (I, O, E, etc.)
- **Location**: Assigned patient location with proper formatting
- **Admission Type**: Mapped from admit source
- **Providers**: Attending, referring, consulting, and admitting doctors
- **Dates**: Admit and discharge dates/times
- **Visit Number**: Encounter identifier mapped to PV1-19
- **Financial Class**: Mapped to PV1-20
- **Discharge Disposition**: Mapped to PV1-36
- **Status**: Bed status and encounter status

### RelatedPerson → NK1 Segment

- **Name**: Full name with components
- **Relationship**: Relationship code and display
- **Address**: Contact address
- **Phone Numbers**: Home and business phone numbers
- **Dates**: Start and end dates for relationship period

### Observation → OBX Segment

- **Value Type**: Automatically determined (NM for numeric, CE for coded, DT for date, ST for string)
- **Observation Code**: LOINC, SNOMED, or other coding systems
- **Value**: Properly formatted based on value type
- **Units**: Value quantity units with system and code
- **Reference Range**: Mapped from observation reference ranges
- **Abnormal Flags**: Interpretation codes (L, H, LL, HH, N, A)
- **Status**: Observation status mapped to HL7 result status
- **Effective Date/Time**: Observation date/time

### AllergyIntolerance → AL1 Segment

- **Allergen Type**: Mapped from allergy type (drug, food, environment, etc.)
- **Allergen Code**: SNOMED, RxNorm, or other coding systems
- **Severity**: Mild, moderate, severe
- **Reactions**: Reaction manifestations with codes
- **Identification Date**: Onset or recorded date

### Condition → DG1 Segment

- **Diagnosis Code**: ICD-10, SNOMED, or other coding systems
- **Diagnosis Description**: Text description
- **Onset Date**: Condition onset date/time
- **Diagnosis Type**: Mapped from category (admitting, working, final, interim)
- **Diagnosing Clinician**: Practitioner reference

## Field Mapping Details

### Dates and Times

- FHIR `dateTime` (YYYY-MM-DDTHH:MM:SS) → HL7 (YYYYMMDDHHMMSS)
- FHIR `date` (YYYY-MM-DD) → HL7 (YYYYMMDD)
- Time components are preserved when available

### Names

- FHIR `HumanName` with family, given, suffix, prefix → HL7 format (Family^Given^Middle^Suffix^Prefix^Degree)
- Multiple given names are handled correctly
- Suffix and prefix arrays use first element

### Addresses

- FHIR `Address` with line, city, state, postalCode, country → HL7 format (Street^City^State^Zip^Country)
- Multiple address lines are combined
- Address use codes are preserved

### Identifiers

- FHIR `Identifier` with system, value, type → HL7 format (ID^CheckDigit^CheckDigitScheme^AssigningAuthority^IdentifierTypeCode^AssigningFacility)
- System URIs are parsed to extract assigning authority
- Type codes are mapped appropriately (MR, SS, DL, AN, VN, etc.)

### Gender

- FHIR gender (male, female, other, unknown) → HL7 administrative sex (M, F, O, U)

### CodeableConcepts

- FHIR `CodeableConcept` with coding and text → HL7 format (Code^Text^CodingSystem)
- Multiple codings use the first one
- Display text is preserved

## Browser Compatibility

This library uses modern JavaScript features:
- ES6 modules (import/export)
- Template literals
- Arrow functions
- Array methods (map, filter, find, forEach)

For older browsers, you may need to transpile the code using Babel or similar tools.

## Node.js Compatibility

- Node.js 12+ recommended
- Node.js 14+ for optimal performance

## Testing

The library includes sample FHIR resources for testing:

```javascript
import { 
  getSampleFHIRPatient, 
  getSampleFHIRBundle, 
  convertFHIRToHL7 
} from 'fhir-to-hl7';

// Test with sample Patient
const patient = getSampleFHIRPatient();
const hl7Message = convertFHIRToHL7(patient);
console.log(hl7Message);

// Test with sample Bundle
const bundle = getSampleFHIRBundle();
const hl7Message2 = convertFHIRToHL7(bundle);
console.log(hl7Message2);
```

## Use Cases

- **FHIR to HL7 Migration**: Convert FHIR resources to HL7 format for legacy system integration
- **Integration**: Bridge FHIR systems with HL7-compliant systems
- **Data Transformation**: Transform FHIR data for HL7-based applications
- **Testing**: Generate HL7 test messages from FHIR resources
- **Interoperability**: Enable communication between FHIR and HL7 systems
- **Legacy System Support**: Convert modern FHIR data for older HL7 systems

## Limitations and Considerations

1. **FHIR Version**: This converter is designed for FHIR R4. For other FHIR versions, modifications may be needed.

2. **HL7 Version**: Output follows HL7 v2.5 specifications. For other HL7 versions, adjustments may be required.

3. **Resource References**: Practitioner, Organization, and Location resources referenced in other resources are not fully resolved. Only basic information is extracted from references.

4. **Incomplete Data**: If FHIR resources are missing required HL7 fields, those fields will be empty. Some HL7 segments may be incomplete.

5. **Custom Extensions**: Custom FHIR extensions may not be converted. You may need to extend the conversion functions.

6. **Code System Mappings**: Some FHIR codes may not have direct HL7 equivalents. The converter uses best-effort mappings, but manual review may be needed.

7. **Message Validation**: The converter does not validate HL7 messages against HL7 specifications. Consider using an HL7 validator for production use.

8. **Multiple Resources**: Multiple resources of the same type (e.g., multiple Observations) are converted to multiple segments with sequential set IDs.

9. **Practitioner Resolution**: Practitioner references are not fully resolved. If you have Practitioner resources in your Bundle, they can be passed for better resolution.

10. **US Core Extensions**: US Core race and ethnicity extensions are supported. Other extensions may need custom handling.

## Extending the Converter

To add support for additional FHIR resources or customize conversions:

1. Create a new conversion function following the pattern:
   ```javascript
   function convertXXXToHL7Segment(xxxResource, setId = 1) {
     const fields = ['XXX']
     fields.push(setId.toString())
     // ... mapping logic
     return fields.join('|')
   }
   ```

2. Add the conversion to the `convertFHIRToHL7` function:
   ```javascript
   const xxxResources = resources.filter(r => r.resourceType === 'XXX')
   xxxResources.forEach((xxxResource, index) => {
     const segment = convertXXXToHL7Segment(xxxResource, index + 1)
     if (segment) {
       segments.push(segment)
     }
   })
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. When contributing:

1. Ensure your code follows the existing style
2. Add tests for new functionality
3. Update documentation as needed
4. Follow HL7 v2.5 specifications
5. Use appropriate field mappings

## License

This project is provided as-is under the MIT License. See LICENSE file for details.

## Disclaimer

**IMPORTANT**: This software is provided for informational and development purposes. While it implements FHIR to HL7 conversion based on HL7 mapping guidelines, users are responsible for:

- Verifying that conversions meet their specific requirements
- Validating HL7 messages against appropriate specifications
- Testing thoroughly before production use
- Ensuring compliance with all applicable regulations and standards
- Reviewing field mappings for accuracy

The authors assume no liability for any misuse or errors in FHIR to HL7 conversion.

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

## Related Projects

- [hl7-to-fhir](https://github.com/yourusername/hl7-to-fhir) - HL7 to FHIR converter (reverse conversion)
- [hl7-parser](https://github.com/yourusername/hl7-parser) - HL7 message parser
- [hl7-deidentification](https://github.com/yourusername/hl7-deidentification) - HL7 de-identification library

## Version History

- **1.0.0** - Initial release
  - Comprehensive FHIR to HL7 conversion
  - Support for all major FHIR resources
  - HL7 v2.5 compliance
  - Intelligent message type detection
  - Proper field and component mapping
  - Bundle support
  - Multiple resource handling
